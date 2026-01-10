"""
Firestore implementation for document metadata storage.

Uses native AsyncClient for non-blocking I/O - no threadpool needed.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import asyncio

from google.cloud import firestore

from ....config import settings, logger
from ..firestore_init import get_db
from .interface import MetadataProviderInterface


class FirestoreMetadataProvider(MetadataProviderInterface):
    """Firestore implementation for document metadata storage using Single Collection Strategy."""
    
    @property
    def db(self) -> firestore.AsyncClient:
        return get_db()

    def generate_id(self) -> str:
        """Generate a unique document ID."""
        # Use sync collection reference just for ID generation (no I/O)
        return self.db.collection(settings.DOCUMENTS_COLLECTION).document().id

    async def create_document(self, doc_id: str, data: dict, archived: bool = False) -> str:
        """Create or update document in single collection with archived flag."""
        data['archived'] = archived
        if archived and 'archived_at' not in data:
            data['archived_at'] = datetime.now(timezone.utc)
        
        await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).set(data)
        logger.info(f"Created document {doc_id} with archived={archived}")
        return doc_id

    async def get_document(self, doc_id: str, archived: bool = False) -> Optional[dict]:
        """Get document from single collection filtered by archived status."""
        doc = await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).get()
        if doc.exists:
            data = doc.to_dict()
            # Verify archived status matches request
            if data.get('archived', False) == archived:
                data['id'] = doc.id
                return data
        return None

    async def list_documents(self, limit: int, archived: bool = False) -> List[dict]:
        """List documents from single collection filtered by archived status."""
        query = (
            self.db.collection(settings.DOCUMENTS_COLLECTION)
            .where("archived", "==", archived)
            .limit(limit)
        )
        docs = query.stream()
        return [{**doc.to_dict(), 'id': doc.id} async for doc in docs]

    async def delete_document(self, doc_id: str, archived: bool = False) -> bool:
        """Delete document from single collection (verifies archived status first)."""
        # Verify the document has the correct archived status before deleting
        doc = await self.get_document(doc_id, archived)
        if not doc:
            logger.warning(f"Document {doc_id} not found with archived={archived}")
            return False
        
        await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).delete()
        logger.info(f"Deleted document {doc_id} with archived={archived}")
        return True

    async def update_document(self, doc_id: str, updates: dict) -> bool:
        """
        Update specific fields in a document.
        
        If a value is None, the field will be deleted from the document.
        """
        # Convert None values to DELETE_FIELD sentinel
        processed_updates = {}
        for key, value in updates.items():
            if value is None:
                processed_updates[key] = firestore.DELETE_FIELD
            else:
                processed_updates[key] = value
        
        await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).update(processed_updates)
        logger.info(f"Updated document {doc_id}")
        return True

    async def get_document_count(self) -> dict:
        """Get counts from single collection filtered by archived status."""
        async def count_with_filter(archived_status: bool) -> int:
            try:
                coll = self.db.collection(settings.DOCUMENTS_COLLECTION)
                agg_query = coll.where("archived", "==", archived_status).count()
                result = await agg_query.get()
                return result[0][0].value
            except Exception:
                return 0
        
        async def count_vectors() -> int:
            try:
                coll = self.db.collection(settings.VECTOR_STORE_COLLECTION)
                agg_query = coll.where("archived", "==", False).count()
                result = await agg_query.get()
                return result[0][0].value
            except Exception:
                return 0
        
        # Run all counts concurrently
        active, archived, vectors = await asyncio.gather(
            count_with_filter(False),
            count_with_filter(True),
            count_vectors()
        )
        
        return {
            "active_documents": active,
            "archived_documents": archived,
            "vector_store": vectors
        }

    async def get_expired_archives(self, cutoff_date: datetime) -> List[dict]:
        """Get archived documents older than cutoff date (for preview/reporting)."""
        query = (
            self.db.collection(settings.DOCUMENTS_COLLECTION)
            .where("archived", "==", True)
            .where("archived_at", "<", cutoff_date)
        )
        docs = query.stream()
        return [{**doc.to_dict(), 'id': doc.id} async for doc in docs]

    async def cleanup_old_archives(self, days: int) -> dict:
        """
        Delete archived documents older than specified days.
        
        Returns dict with:
        - deleted_count: Number of documents deleted
        - documents: List of deleted document info (id, filename)
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        query = (
            self.db.collection(settings.DOCUMENTS_COLLECTION)
            .where("archived", "==", True)
            .where("archived_at", "<", cutoff)
        )
        
        batch = self.db.batch()
        count = 0
        deleted = 0
        deleted_docs = []
        
        async for doc in query.stream():
            doc_data = doc.to_dict()
            deleted_docs.append({
                'id': doc.id,
                'filename': doc_data.get('filename', 'unknown')
            })
            batch.delete(doc.reference)
            count += 1
            if count >= settings.FIRESTORE_BATCH_SIZE:
                await batch.commit()
                batch = self.db.batch()
                deleted += count
                count = 0
        
        if count > 0:
            await batch.commit()
            deleted += count
        
        logger.info(f"Cleaned up {deleted} old archived documents")
        return {'deleted_count': deleted, 'documents': deleted_docs}
