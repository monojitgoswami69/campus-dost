"""
Firestore implementation for vector storage.

Uses native AsyncClient for non-blocking I/O - no threadpool needed.
"""
from datetime import datetime, timezone
from typing import List, Optional

from google.cloud import firestore
from google.cloud.firestore_v1.vector import Vector

from ....config import settings, logger
from ..firestore_init import get_db
from .interface import VectorStorageInterface


class FirestoreVectorStorage(VectorStorageInterface):
    """Firestore implementation for vector storage using Single Collection Strategy."""
    
    @property
    def db(self) -> firestore.AsyncClient:
        return get_db()

    async def store_vectors(self, doc_id: str, vector_data: List[dict]) -> int:
        """
        Store vector chunks in Firestore with deterministic IDs and archived=False flag.
        
        Uses format: {doc_id}_0, {doc_id}_1, {doc_id}_2, etc.
        This allows easy referencing and batch operations on vectors for a specific document.
        """
        batch = self.db.batch()
        count = 0
        
        for chunk_data in vector_data:
            # Use deterministic ID format: {doc_id}_{chunk_index}
            chunk_index = chunk_data.get('chunk_index', 0)
            chunk_id = f"{doc_id}_{chunk_index}"
            chunk_ref = self.db.collection(settings.VECTOR_STORE_COLLECTION).document(chunk_id)
            
            # Convert embedding array to Firestore Vector type for native vector search
            if 'embedding' in chunk_data and isinstance(chunk_data['embedding'], list):
                chunk_data['embedding'] = Vector(chunk_data['embedding'])
            
            chunk_data['parent_doc_id'] = doc_id
            chunk_data['archived'] = False  # Single collection strategy
            chunk_data['created_at'] = chunk_data.get('created_at', datetime.now(timezone.utc))
            batch.set(chunk_ref, chunk_data)
            count += 1
            
            if count >= settings.FIRESTORE_BATCH_SIZE:
                await batch.commit()
                batch = self.db.batch()
                count = 0
        
        if count > 0:
            await batch.commit()
        
        return len(vector_data)

    async def get_vectors(self, doc_id: str, archived: bool = False) -> Optional[dict]:
        """Get vectors from single collection filtered by archived status."""
        query = (
            self.db.collection(settings.VECTOR_STORE_COLLECTION)
            .where("parent_doc_id", "==", doc_id)
            .where("archived", "==", archived)
            .order_by("chunk_index")
        )
        
        chunks = [d.to_dict() async for d in query.stream()]
        
        if not chunks:
            return None
        return {"document_id": doc_id, "chunks": chunks, "chunk_count": len(chunks)}

    async def delete_vectors(self, doc_id: str, archived: bool = False) -> bool:
        """Delete vectors from single collection filtered by archived status."""
        query = (
            self.db.collection(settings.VECTOR_STORE_COLLECTION)
            .where("parent_doc_id", "==", doc_id)
            .where("archived", "==", archived)
        )
        
        batch = self.db.batch()
        count = 0
        
        async for doc in query.stream():
            batch.delete(doc.reference)
            count += 1
            if count >= settings.FIRESTORE_BATCH_SIZE:
                await batch.commit()
                batch = self.db.batch()
                count = 0
        
        if count > 0:
            await batch.commit()
        
        return True

    async def archive_vectors(self, doc_id: str) -> int:
        """
        Archive vectors by setting archived=True flag (Single Collection Strategy).
        
        Efficiently updates vectors using deterministic IDs where possible,
        falling back to query-based approach for backwards compatibility.
        """
        query = (
            self.db.collection(settings.VECTOR_STORE_COLLECTION)
            .where("parent_doc_id", "==", doc_id)
            .where("archived", "==", False)
        )
        
        # Collect all docs first to check if any exist
        docs = [doc async for doc in query.stream()]
        
        if not docs:
            logger.warning(f"No active vectors found for document {doc_id} to archive")
            return 0
        
        batch = self.db.batch()
        count = 0
        total = 0
        archived_ids = []
        
        for doc in docs:
            # Batch update: set archived=True and add archived_at timestamp
            batch.update(doc.reference, {
                'archived': True,
                'archived_at': datetime.now(timezone.utc)
            })
            archived_ids.append(doc.id)
            count += 1
            total += 1
            if count >= settings.FIRESTORE_BATCH_SIZE:
                await batch.commit()
                logger.debug(f"Committed batch of {count} vector updates")
                batch = self.db.batch()
                count = 0
        
        if count > 0:
            await batch.commit()
            logger.debug(f"Committed final batch of {count} vector updates")
        
        logger.info(f"Archived {total} vectors for document {doc_id}: {archived_ids[:5]}{'...' if len(archived_ids) > 5 else ''}")
        return total

    async def restore_vectors(self, doc_id: str) -> int:
        """
        Restore vectors by setting archived=False flag (Single Collection Strategy).
        
        Efficiently restores archived vectors for reactivation.
        """
        query = (
            self.db.collection(settings.VECTOR_STORE_COLLECTION)
            .where("parent_doc_id", "==", doc_id)
            .where("archived", "==", True)
        )
        
        # Collect all docs first to check if any exist
        docs = [doc async for doc in query.stream()]
        
        if not docs:
            logger.warning(f"No archived vectors found for document {doc_id} to restore")
            return 0
        
        batch = self.db.batch()
        count = 0
        total = 0
        restored_ids = []
        
        for doc in docs:
            # Batch update: set archived=False and remove archived_at timestamp
            batch.update(doc.reference, {
                'archived': False,
                'archived_at': firestore.DELETE_FIELD
            })
            restored_ids.append(doc.id)
            count += 1
            total += 1
            if count >= settings.FIRESTORE_BATCH_SIZE:
                await batch.commit()
                logger.debug(f"Committed batch of {count} vector restorations")
                batch = self.db.batch()
                count = 0
        
        if count > 0:
            await batch.commit()
            logger.debug(f"Committed final batch of {count} vector restorations")
        
        logger.info(f"Restored {total} vectors for document {doc_id}: {restored_ids[:5]}{'...' if len(restored_ids) > 5 else ''}")
        return total
