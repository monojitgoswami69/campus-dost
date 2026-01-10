import time
from datetime import datetime, timezone
from fastapi import BackgroundTasks
from ..config import logger
from ..exceptions import FileExtractionError, TextProcessingError, NotFoundError, EmbeddingError
from ..providers.storage import storage_provider
from ..providers.database.metadata import metadata_provider
from ..providers.database.vectors import vector_storage_provider
from ..providers.database.activity import activity_provider
from ..providers.llm.embeddings import embedding_provider
from ..processors.extractors import document_extractor
from ..processors.cleaners import text_cleaner
from ..processors.chunkers import text_chunker

class IngestionPipeline:
    async def process_file(self, path: str, filename: str, content: bytes = None,
                           actor: str = "admin", background_tasks: BackgroundTasks = None) -> dict:
        start_time = time.perf_counter()
        logger.info(f"Processing {filename}")
        
        extract_start = time.perf_counter()
        if path == "virtual_file" and content:
            raw_text = content.decode("utf-8", errors="ignore")
        else:
            from fastapi.concurrency import run_in_threadpool
            raw_text = await run_in_threadpool(document_extractor.extract, path)
        extract_elapsed = (time.perf_counter() - extract_start) * 1000

        if not raw_text.strip():
            raise FileExtractionError("Empty text")

        clean_start = time.perf_counter()
        cleaned_text = text_cleaner.clean(raw_text)
        chunks = await text_chunker.chunk(cleaned_text)
        clean_elapsed = (time.perf_counter() - clean_start) * 1000

        if not chunks:
            raise TextProcessingError("No chunks generated")

        embed_start = time.perf_counter()
        doc_id = metadata_provider.generate_id()
        
        # Generate embeddings - this now raises EmbeddingError if ANY batch fails
        # instead of silently returning zero vectors
        embeddings = await embedding_provider.generate_embeddings(chunks)
        
        vector_chunks_data = []
        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            vector_chunks_data.append({
                "chunk_index": i,
                "text": chunk_text,
                "embedding": list(embedding),
                "document_id": doc_id,
                "created_at": datetime.now(timezone.utc),
                "metadata": {"filename": filename}
            })
        
        v_count = await vector_storage_provider.store_vectors(doc_id, vector_chunks_data)
        embed_elapsed = (time.perf_counter() - embed_start) * 1000

        if content is None:
            with open(path, 'rb') as f:
                content = f.read()

        # Critical section: storage and metadata must succeed or cleanup orphaned data
        try:
            storage_start = time.perf_counter()
            storage_data = await storage_provider.upload_file(doc_id, filename, content, f"Upload: {filename}")
            storage_elapsed = (time.perf_counter() - storage_start) * 1000

            meta_start = time.perf_counter()
            meta = {
                "document_id": doc_id,
                "filename": filename,
                "storage_path": storage_data["storage_path"],
                "storage_url": storage_data["storage_url"],
                "storage_sha": storage_data.get("storage_sha"),  # Optional field for providers that support it
                "raw_text": raw_text,
                "chunk_count": len(chunks),
                "vector_count": v_count,
                "file_size": len(content),
                "status": "active",
                "archived": False,  # Explicitly set for single collection pattern
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "created_by": actor
            }
            await metadata_provider.create_document(doc_id, meta, archived=False)
            meta_elapsed = (time.perf_counter() - meta_start) * 1000
        except Exception as e:
            # Cleanup: delete orphaned vectors if storage or metadata creation fails
            logger.error(f"Storage/metadata creation failed for {filename}, cleaning up vectors: {e}")
            try:
                await vector_storage_provider.delete_vectors(doc_id)
                logger.info(f"Cleaned up {v_count} orphaned vectors for failed upload: {doc_id}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup vectors for {doc_id}: {cleanup_error}")
            raise  # Re-raise original exception
        
        total_elapsed = (time.perf_counter() - start_time) * 1000

        logger.info(
            f"File processed: {filename} | "
            f"Extract: {extract_elapsed:.1f}ms | "
            f"Clean/Chunk: {clean_elapsed:.1f}ms | "
            f"Embed: {embed_elapsed:.1f}ms | "
            f"Storage: {storage_elapsed:.1f}ms | "
            f"Meta: {meta_elapsed:.1f}ms | "
            f"Total: {total_elapsed:.1f}ms"
        )

        if background_tasks:
            background_tasks.add_task(
                activity_provider.log_activity, "document_uploaded", actor, "document", doc_id, {"filename": filename}
            )
            # Use atomic increments instead of expensive full recalculation
            from ..providers.database.metrics import metrics_provider
            background_tasks.add_task(metrics_provider.increment_document_counts, active_delta=1, vectors_delta=v_count)
            background_tasks.add_task(metrics_provider.update_total_size, len(content))
        else:
            await activity_provider.log_activity("document_uploaded", actor, "document", doc_id, {"filename": filename})
            # Use atomic increments instead of expensive full recalculation
            from ..providers.database.metrics import metrics_provider
            await metrics_provider.increment_document_counts(active_delta=1, vectors_delta=v_count)
            await metrics_provider.update_total_size(len(content))

        return {
            "status": "success",
            "document_id": doc_id,
            "chunks_count": len(chunks),
            "vectors_count": v_count,
            "storage_url": storage_data.get("storage_url")
        }

    async def restore_document(self, archive_id: str, actor: str, background_tasks: BackgroundTasks) -> dict:
        """
        Restore an archived document by updating its archived flag to False.
        
        IMPORTANT: This preserves the original document ID to maintain consistency with:
        - Dropbox storage (files are stored with document_id in path)
        - Vector store (vectors reference parent_doc_id)
        - Any external references to the document
        """
        start_time = time.perf_counter()
        archived = await metadata_provider.get_document(archive_id, archived=True)
        if not archived:
            raise NotFoundError("Archive not found")
        
        filename = archived.get("filename", "restored.txt")
        raw_text = archived.get("raw_text", "")
        
        # CRITICAL: Keep the same document ID to maintain Dropbox/vector consistency
        doc_id = archive_id
        
        # Restore vectors first (set archived=False on existing vectors)
        process_start = time.perf_counter()
        v_count = await vector_storage_provider.restore_vectors(doc_id)
        
        if v_count == 0:
            # No archived vectors found - this shouldn't happen if archive worked correctly
            # Regenerate embeddings as fallback (slow path)
            logger.warning(f"No archived vectors found for {doc_id}, regenerating embeddings")
            cleaned_text = text_cleaner.clean(raw_text)
            chunks = await text_chunker.chunk(cleaned_text)
            
            # Generate embeddings and prepare vector data
            embeddings = await embedding_provider.generate_embeddings(chunks)
            vector_chunks_data = []
            for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
                if all(v == 0.0 for v in embedding):
                    continue
                vector_chunks_data.append({
                    "chunk_index": i,
                    "text": chunk_text,
                    "embedding": list(embedding),
                    "document_id": doc_id,
                    "created_at": datetime.now(timezone.utc),
                    "metadata": {"filename": filename}
                })
            v_count = await vector_storage_provider.store_vectors(doc_id, vector_chunks_data)
        else:
            logger.info(f"Restored {v_count} vectors from archive for {doc_id}")
        
        process_elapsed = (time.perf_counter() - process_start) * 1000
        
        # Update the document metadata to set archived=False (in-place update)
        meta_start = time.perf_counter()
        await metadata_provider.update_document(doc_id, {
            "archived": False,
            "archived_at": None,  # Clear archived timestamp
            "archived_by": None,  # Clear archived_by
            "updated_at": datetime.now(timezone.utc),
            "restored_at": datetime.now(timezone.utc),
            "restored_by": actor,
            "status": "active"
        })
        
        meta_elapsed = (time.perf_counter() - meta_start) * 1000
        total_elapsed = (time.perf_counter() - start_time) * 1000
        
        logger.info(
            f"Document restored: {filename} (ID: {doc_id}) | "
            f"Vectors: {v_count} | "
            f"Process: {process_elapsed:.1f}ms | "
            f"Meta: {meta_elapsed:.1f}ms | "
            f"Total: {total_elapsed:.1f}ms"
        )
        
        # Use atomic increments for restored document
        from ..providers.database.metrics import metrics_provider
        background_tasks.add_task(metrics_provider.increment_document_counts, active_delta=1, archived_delta=-1)
        background_tasks.add_task(
            activity_provider.log_activity, "document_restored", actor, "document", doc_id, {"filename": filename}
        )
        
        return {"document_id": doc_id}

pipeline = IngestionPipeline()
