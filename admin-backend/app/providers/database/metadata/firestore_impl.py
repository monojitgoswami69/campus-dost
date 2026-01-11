"""
Firestore implementation for document metadata storage.

Uses firebase-admin SDK with AsyncClient for non-blocking I/O.

MULTI-TENANCY: All operations are scoped to org_id for data isolation.
Each organization can only access their own documents.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import asyncio

from google.cloud.firestore import AsyncClient

from ....config import settings, logger
from ..firestore_init import get_db
from .interface import MetadataProviderInterface


class FirestoreMetadataProvider(MetadataProviderInterface):
    """
    Firestore implementation for document metadata storage.
    
    MULTI-TENANCY: Uses Single Collection Strategy with org_id filtering.
    All queries MUST include org_id to ensure data isolation between organizations.
    """
    
    @property
    def db(self) -> AsyncClient:
        return get_db()

    def generate_id(self) -> str:
        """Generate a unique document ID."""
        # Use sync collection reference just for ID generation (no I/O)
        return self.db.collection(settings.DOCUMENTS_COLLECTION).document().id

    async def create_document(self, org_id: str, doc_id: str, data: dict, archived: bool = False) -> str:
        """
        Create or update document with organization scope.
        
        SECURITY: org_id is ALWAYS injected - never from user input.
        """
        data['org_id'] = org_id  # CRITICAL: Always set org_id
        data['archived'] = archived
        if archived and 'archived_at' not in data:
            data['archived_at'] = datetime.now(timezone.utc)
        
        await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).set(data)
        logger.info(f"Created document {doc_id} for org={org_id} with archived={archived}")
        return doc_id

    async def get_document(self, org_id: str, doc_id: str, archived: bool = False) -> Optional[dict]:
        """
        Get document by ID, filtered by organization and archived status.
        
        SECURITY: Verifies org_id matches to prevent cross-org access.
        """
        doc = await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).get()
        if doc.exists:
            data = doc.to_dict()
            # SECURITY: Verify org_id AND archived status match
            if data.get('org_id') == org_id and data.get('archived', False) == archived:
                data['id'] = doc.id
                return data
            elif data.get('org_id') != org_id:
                logger.warning(f"Cross-org access attempt: {org_id} tried to access doc from {data.get('org_id')}")
        return None

    async def list_documents(self, org_id: str, limit: int, archived: bool = False) -> List[dict]:
        """
        List documents filtered by organization and archived status.
        
        MULTI-TENANCY: Uses composite index on (org_id, archived).
        """
        query = (
            self.db.collection(settings.DOCUMENTS_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
            .where("archived", "==", archived)
            .limit(limit)
        )
        docs = query.stream()
        return [{**doc.to_dict(), 'id': doc.id} async for doc in docs]

    async def delete_document(self, org_id: str, doc_id: str, archived: bool = False) -> bool:
        """
        Delete document (verifies org_id and archived status first).
        
        SECURITY: Prevents cross-org deletion.
        """
        # Verify the document belongs to this org and has correct archived status
        doc = await self.get_document(org_id, doc_id, archived)
        if not doc:
            logger.warning(f"Delete failed: Document {doc_id} not found for org={org_id} with archived={archived}")
            return False
        
        await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).delete()
        logger.info(f"Deleted document {doc_id} for org={org_id}")
        return True

    async def update_document(self, org_id: str, doc_id: str, updates: dict) -> bool:
        """
        Update specific fields in a document.
        
        SECURITY: Verifies org_id before update to prevent cross-org modification.
        If a value is None, the field will be deleted from the document.
        """
        # First verify document belongs to this org
        existing = await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).get()
        if not existing.exists:
            logger.warning(f"Update failed: Document {doc_id} not found")
            return False
        
        existing_data = existing.to_dict()
        if existing_data.get('org_id') != org_id:
            logger.warning(f"Cross-org update attempt: {org_id} tried to update doc from {existing_data.get('org_id')}")
            return False
        
        # Convert None values to DELETE_FIELD sentinel
        processed_updates = {}
        for key, value in updates.items():
            if key == 'org_id':
                continue  # Never allow org_id modification
            if value is None:
                processed_updates[key] = firestore.DELETE_FIELD
            else:
                processed_updates[key] = value
        
        await self.db.collection(settings.DOCUMENTS_COLLECTION).document(doc_id).update(processed_updates)
        logger.info(f"Updated document {doc_id} for org={org_id}")
        return True

    async def get_document_count(self, org_id: str) -> dict:
        """
        Get document counts for an organization.
        
        MULTI-TENANCY: Counts are per-organization.
        """
        async def count_with_filter(archived_status: bool) -> int:
            try:
                coll = self.db.collection(settings.DOCUMENTS_COLLECTION)
                agg_query = coll.where("org_id", "==", org_id).where("archived", "==", archived_status).count()
                result = await agg_query.get()
                return result[0][0].value
            except Exception:
                return 0
        
        async def count_vectors() -> int:
            try:
                coll = self.db.collection(settings.VECTOR_STORE_COLLECTION)
                agg_query = coll.where("org_id", "==", org_id).where("archived", "==", False).count()
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
            "vector_store": vectors,
            "org_id": org_id
        }

    async def get_expired_archives(self, org_id: str, cutoff_date: datetime) -> List[dict]:
        """Get archived documents older than cutoff date for an organization."""
        query = (
            self.db.collection(settings.DOCUMENTS_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
            .where("archived", "==", True)
            .where("archived_at", "<", cutoff_date)
        )
        docs = query.stream()
        return [{**doc.to_dict(), 'id': doc.id} async for doc in docs]

    async def cleanup_old_archives(self, org_id: str, days: int) -> dict:
        """
        Delete archived documents older than specified days for an organization.
        
        SECURITY: Only cleans up documents belonging to the specified org.
        
        Returns dict with:
        - deleted_count: Number of documents deleted
        - documents: List of deleted document info (id, filename)
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        query = (
            self.db.collection(settings.DOCUMENTS_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
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
        
        logger.info(f"Cleaned up {deleted} old archived documents for org={org_id}")
        return {'deleted_count': deleted, 'documents': deleted_docs, 'org_id': org_id}

    # --- Migration Helper Methods ---
    
    async def migrate_add_org_id(self, default_org_id: str) -> dict:
        """
        MIGRATION: Add org_id to all existing documents.
        
        This should be run ONCE during migration to multi-tenancy.
        Documents without org_id will be assigned to default_org_id.
        
        Returns migration statistics.
        """
        query = self.db.collection(settings.DOCUMENTS_COLLECTION).limit(500)
        
        migrated = 0
        skipped = 0
        batch = self.db.batch()
        count = 0
        
        async for doc in query.stream():
            data = doc.to_dict()
            if 'org_id' not in data or not data['org_id']:
                batch.update(doc.reference, {'org_id': default_org_id})
                count += 1
                migrated += 1
                
                if count >= settings.FIRESTORE_BATCH_SIZE:
                    await batch.commit()
                    batch = self.db.batch()
                    count = 0
            else:
                skipped += 1
        
        if count > 0:
            await batch.commit()
        
        logger.info(f"Migration complete: {migrated} documents updated, {skipped} already had org_id")
        return {'migrated': migrated, 'skipped': skipped, 'default_org_id': default_org_id}
