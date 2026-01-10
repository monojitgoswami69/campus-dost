import time
import io
import zipfile
import asyncio
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from ..config import settings, logger
from ..dependencies import require_admin
from ..utils.limiter import limiter
from ..providers.database.metadata import metadata_provider
from ..providers.database.vectors import vector_storage_provider
from ..providers.database.activity import activity_provider
from ..providers.database.metrics import metrics_provider
from ..providers.storage import storage_provider
from ..exceptions import NotFoundError

router = APIRouter(prefix="/api/v1/knowledge-base", tags=["knowledge-base"])

@router.get("/files")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def list_documents(request: Request, limit: int = settings.API_DEFAULT_LIMIT, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    limit = min(max(1, limit), settings.API_MAX_LIMIT)
    docs = await metadata_provider.list_documents(limit, archived=False)
    for d in docs:
        if d.get('created_at'): d['created_at'] = d['created_at'].isoformat() if hasattr(d['created_at'], 'isoformat') else str(d['created_at'])
        if d.get('updated_at'): d['updated_at'] = d['updated_at'].isoformat() if hasattr(d['updated_at'], 'isoformat') else str(d['updated_at'])
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Listed {len(docs)} documents | {elapsed:.1f}ms")
    return {"status": "success", "documents": docs, "total": len(docs)}

@router.get("/document/{doc_id}")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_document(request: Request, doc_id: str, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    if not doc_id or len(doc_id) > 100: raise HTTPException(400, "Invalid document ID")
    doc = await metadata_provider.get_document(doc_id, archived=False)
    if not doc: raise NotFoundError("Document not found")
    if doc.get('created_at'): doc['created_at'] = doc['created_at'].isoformat() if hasattr(doc['created_at'], 'isoformat') else str(doc['created_at'])
    if doc.get('updated_at'): doc['updated_at'] = doc['updated_at'].isoformat() if hasattr(doc['updated_at'], 'isoformat') else str(doc['updated_at'])
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Retrieved document: {doc_id} | {elapsed:.1f}ms")
    return {"status": "success", "document": doc, "raw_text_preview": doc.get("raw_text", "")[:500]}

@router.put("/edit")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def edit_document(request: Request, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    """
    Edit and reindex a document
    
    Updates the document content and regenerates embeddings.
    The document is temporarily archived during reindexing to prevent inconsistent search results.
    """
    start_time = time.perf_counter()
    req = await request.json()
    document_id = req.get("document_id")
    content = req.get("content")
    
    if not document_id:
        raise HTTPException(400, "Document ID required")
    if not content:
        raise HTTPException(400, "Content required")
    
    # Get document metadata
    doc = await metadata_provider.get_document(document_id, archived=False)
    if not doc:
        raise NotFoundError("Document not found")
    
    # Import processing components
    from ..processors.cleaners import text_cleaner
    from ..processors.chunkers import text_chunker
    from ..providers.llm.embeddings import embedding_provider
    
    ops_start = time.perf_counter()
    
    try:
        # Step 1: Archive old vectors (keep metadata active)
        logger.info(f"Archiving old vectors for {document_id}")
        archived_count = await vector_storage_provider.archive_vectors(document_id)
        
        # Step 2: Clean and chunk the new content
        logger.info(f"Cleaning and chunking new content for {document_id}")
        cleaned_text = text_cleaner.clean(content)
        chunks = await text_chunker.chunk(cleaned_text)
        
        if not chunks:
            raise HTTPException(400, "Content resulted in no valid chunks")
        
        # Step 3: Generate embeddings for new chunks
        logger.info(f"Generating embeddings for {len(chunks)} chunks")
        embeddings = await embedding_provider.generate_embeddings(chunks)
        
        # Step 4: Store new vectors
        logger.info(f"Storing {len(embeddings)} new vectors for {document_id}")
        vector_data = [
            {
                "chunk_index": i,
                "text": chunk_text,
                "embedding": list(embedding),
                "document_id": document_id,
                "created_at": datetime.now(),
                "metadata": {"filename": doc["filename"]}
            }
            for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings))
        ]
        
        v_count = await vector_storage_provider.store_vectors(document_id, vector_data)
        
        # Step 5: Update document metadata
        await metadata_provider.update_document(document_id, {
            "raw_text": content,
            "chunk_count": len(chunks),
            "vector_count": v_count,
            "updated_at": datetime.now(),
            "updated_by": user["uid"]
        })
        
        ops_elapsed = (time.perf_counter() - ops_start) * 1000
        total_elapsed = (time.perf_counter() - start_time) * 1000
        
        logger.info(
            f"Edited document {document_id} | "
            f"Archived: {archived_count} vectors | New: {len(embeddings)} vectors | "
            f"Ops: {ops_elapsed:.1f}ms | Total: {total_elapsed:.1f}ms"
        )
        
        # Log activity
        background_tasks.add_task(
            activity_provider.log_activity,
            "document_edited",
            user["uid"],
            "document",
            document_id,
            {
                "filename": doc["filename"],
                "old_vectors": archived_count,
                "new_vectors": len(embeddings)
            }
        )
        
        return {
            "status": "success",
            "message": "Document updated and reindexed",
            "document_id": document_id,
            "old_vectors": archived_count,
            "new_vectors": len(embeddings)
        }
        
    except Exception as e:
        logger.error(f"Failed to edit document {document_id}: {e}")
        # If editing failed, restore the archived vectors
        try:
            await vector_storage_provider.restore_vectors(document_id)
            logger.info(f"Restored archived vectors for {document_id} after edit failure")
        except Exception as restore_error:
            logger.error(f"Failed to restore vectors for {document_id}: {restore_error}")
        
        raise HTTPException(500, f"Failed to edit document: {str(e)}")


@router.post("/archive")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def archive_document(request: Request, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    req = await request.json()
    document_id = req.get("document_id")
    if not document_id: raise HTTPException(400, "Document ID required")
    doc = await metadata_provider.get_document(document_id, archived=False)
    if not doc: raise NotFoundError("Document not found")
    ops_start = time.perf_counter()
    
    # Archive vectors and metadata in parallel
    # IMPORTANT: Both must succeed to maintain consistency
    results = await asyncio.gather(
        vector_storage_provider.archive_vectors(document_id),
        metadata_provider.update_document(document_id, {
            "archived": True,
            "archived_at": datetime.now(),
            "archived_by": user["uid"]
        }),
        return_exceptions=True
    )
    
    ops_elapsed = (time.perf_counter() - ops_start) * 1000
    
    # Check results and log appropriately
    vectors_archived = 0
    metadata_updated = False
    errors = []
    
    if isinstance(results[0], Exception):
        errors.append(f"Vector archive failed: {results[0]}")
        logger.error(f"Failed to archive vectors for {document_id}: {results[0]}")
    else:
        vectors_archived = results[0] if isinstance(results[0], int) else 0
        logger.info(f"Archived {vectors_archived} vectors for document {document_id}")
    
    if isinstance(results[1], Exception):
        errors.append(f"Metadata update failed: {results[1]}")
        logger.error(f"Failed to update metadata for {document_id}: {results[1]}")
    else:
        metadata_updated = True
    
    # If both failed, raise an error
    if errors and len(errors) == 2:
        raise HTTPException(500, f"Archive failed: {'; '.join(errors)}")
    
    total_elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Archived {document_id} | Vectors: {vectors_archived} | Ops: {ops_elapsed:.1f}ms | Total: {total_elapsed:.1f}ms")
    
    # Use atomic increments instead of expensive full recalculation
    background_tasks.add_task(metrics_provider.increment_document_counts, active_delta=-1, archived_delta=1)
    
    background_tasks.add_task(activity_provider.log_activity, "document_archived", user["uid"], "document", document_id, {"filename": doc["filename"], "vectors_archived": vectors_archived})
    
    return {
        "status": "success", 
        "message": "Document archived", 
        "document_id": document_id,
        "vectors_archived": vectors_archived
    }

@router.delete("/document/{doc_id}")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def delete_document(request: Request, doc_id: str, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    """
    Permanently delete a document and all associated data:
    - Document metadata from Firestore
    - All vectors (active or archived) from Firestore
    - File from Dropbox storage
    """
    start_time = time.perf_counter()
    
    # Try to find document in active first, then archived
    doc = await metadata_provider.get_document(doc_id, archived=False)
    is_archived = False
    
    if not doc:
        doc = await metadata_provider.get_document(doc_id, archived=True)
        is_archived = True
    
    if not doc:
        raise NotFoundError("Document not found")
    
    filename = doc.get("filename", "unknown")
    file_size = doc.get("file_size", 0) or doc.get("size", 0)
    
    # Delete all components in parallel
    ops_start = time.perf_counter()
    results = await asyncio.gather(
        storage_provider.delete_file(doc_id, filename, is_archived, "Deleted by admin"),
        vector_storage_provider.delete_vectors(doc_id, archived=is_archived),
        metadata_provider.delete_document(doc_id, archived=is_archived),
        return_exceptions=True
    )
    ops_elapsed = (time.perf_counter() - ops_start) * 1000
    
    # Check for errors
    errors = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            operation_names = ["storage", "vectors", "metadata"]
            errors.append(f"{operation_names[i]}: {str(result)}")
            logger.error(f"Delete operation {operation_names[i]} failed for {doc_id}: {result}")
    
    # Log summary
    total_elapsed = (time.perf_counter() - start_time) * 1000
    status_msg = "with warnings" if errors else "successfully"
    logger.info(f"Deleted {doc_id} {status_msg} | Archived: {is_archived} | Ops: {ops_elapsed:.1f}ms | Total: {total_elapsed:.1f}ms")
    
    # Update metrics
    if file_size > 0:
        background_tasks.add_task(metrics_provider.update_total_size, -file_size)
    background_tasks.add_task(metrics_provider.update_metrics)
    background_tasks.add_task(
        activity_provider.log_activity, 
        "document_deleted", 
        user["uid"], 
        "document", 
        doc_id, 
        {"filename": filename, "was_archived": is_archived, "errors": errors if errors else None}
    )
    
    return {
        "status": "success", 
        "message": "Document deleted permanently",
        "document_id": doc_id,
        "errors": errors if errors else None
    }

@router.get("/download/{doc_id}")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def download_doc(request: Request, doc_id: str, preview: bool = False, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    doc = await metadata_provider.get_document(doc_id, archived=False)
    archived = False
    if not doc:
        doc = await metadata_provider.get_document(doc_id, archived=True)
        archived = True
    if not doc: raise NotFoundError("Document not found")
    content = await storage_provider.download_file(doc_id, doc["filename"], archived)
    if not content: content = doc.get("raw_text", "").encode("utf-8")
    media_type = "text/plain" if preview else "application/octet-stream"
    disposition = "inline" if preview else "attachment"
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Download prepared: {doc['filename']} | {elapsed:.1f}ms")
    return StreamingResponse(io.BytesIO(content), media_type=media_type, headers={"Content-Disposition": f'{disposition}; filename="{doc["filename"]}"'})

@router.get("/preview/{doc_id}")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def preview_doc(request: Request, doc_id: str, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    doc = await metadata_provider.get_document(doc_id, archived=False)
    archived = False
    if not doc:
        doc = await metadata_provider.get_document(doc_id, archived=True)
        archived = True
    if not doc: raise NotFoundError("Document not found")
    content = await storage_provider.download_file(doc_id, doc["filename"], archived)
    if not content: content = doc.get("raw_text", "").encode("utf-8")
    
    # Determine media type based on file extension
    ext = Path(doc["filename"]).suffix.lower()
    media_type_map = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.json': 'application/json',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
    }
    media_type = media_type_map.get(ext, 'application/octet-stream')
    
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Preview prepared: {doc['filename']} ({media_type}) | {elapsed:.1f}ms")
    return StreamingResponse(io.BytesIO(content), media_type=media_type, headers={"Content-Disposition": f'inline; filename="{doc["filename"]}"'})
