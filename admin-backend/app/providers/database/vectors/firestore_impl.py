"""
Firestore implementation for vector storage.

Uses firebase-admin SDK with AsyncClient for non-blocking I/O.

MULTI-TENANCY: All operations are scoped to org_id for data isolation.
Each organization can only access their own vectors.
"""
from datetime import datetime, timezone
from typing import List, Optional

from google.cloud.firestore import AsyncClient
from google.cloud.firestore_v1.vector import Vector

from ....config import settings, logger
from ..firestore_init import get_db
from .interface import VectorStorageInterface


class FirestoreVectorStorage(VectorStorageInterface):
    """
    Firestore implementation for vector storage.
    
    MULTI-TENANCY: Uses Single Collection Strategy with org_id filtering.
    All queries MUST include org_id to ensure data isolation between organizations.
    """
    
    @property
    def db(self) -> AsyncClient:
        return get_db()

    async def store_vectors(self, org_id: str, doc_id: str, vector_data: List[dict]) -> int:
        """
        Store vector chunks in Firestore with organization scope.
        
        SECURITY: org_id is ALWAYS injected - never from user input.
        Uses deterministic IDs: {doc_id}_{chunk_index}
        """
        batch = self.db.batch()
        count = 0
        
        for chunk_data in vector_data:
            chunk_index = chunk_data.get('chunk_index', 0)
            chunk_id = f"{doc_id}_{chunk_index}"
            chunk_ref = self.db.collection(settings.VECTOR_STORE_COLLECTION).document(chunk_id)
            
            # Convert embedding array to Firestore Vector type
            if 'embedding' in chunk_data and isinstance(chunk_data['embedding'], list):
                chunk_data['embedding'] = Vector(chunk_data['embedding'])
            
            chunk_data['org_id'] = org_id  # CRITICAL: Always set org_id
            chunk_data['parent_doc_id'] = doc_id
            chunk_data['archived'] = False
            chunk_data['created_at'] = chunk_data.get('created_at', datetime.now(timezone.utc))
            batch.set(chunk_ref, chunk_data)
            count += 1
            
            if count >= settings.FIRESTORE_BATCH_SIZE:
                await batch.commit()
                batch = self.db.batch()
                count = 0
        
        if count > 0:
            await batch.commit()
        
        logger.info(f"Stored {len(vector_data)} vectors for doc={doc_id} org={org_id}")
        return len(vector_data)

    async def get_vectors(self, org_id: str, doc_id: str, archived: bool = False) -> Optional[dict]:
        """
        Get vectors filtered by organization, document ID, and archived status.
        
        SECURITY: org_id filter prevents cross-org access.
        """
        query = (
            self.db.collection(settings.VECTOR_STORE_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
            .where("parent_doc_id", "==", doc_id)
            .where("archived", "==", archived)
            .order_by("chunk_index")
        )
        
        chunks = [d.to_dict() async for d in query.stream()]
        
        if not chunks:
            return None
        return {"document_id": doc_id, "org_id": org_id, "chunks": chunks, "chunk_count": len(chunks)}

    async def delete_vectors(self, org_id: str, doc_id: str, archived: bool = False) -> bool:
        """
        Delete vectors filtered by organization, document ID, and archived status.
        
        SECURITY: org_id filter prevents cross-org deletion.
        """
        query = (
            self.db.collection(settings.VECTOR_STORE_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
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
        
        logger.info(f"Deleted vectors for doc={doc_id} org={org_id} archived={archived}")
        return True

    async def archive_vectors(self, org_id: str, doc_id: str) -> int:
        """
        Archive vectors by setting archived=True flag.
        
        SECURITY: org_id filter ensures only organization's vectors are archived.
        """
        query = (
            self.db.collection(settings.VECTOR_STORE_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
            .where("parent_doc_id", "==", doc_id)
            .where("archived", "==", False)
        )
        
        docs = [doc async for doc in query.stream()]
        
        if not docs:
            logger.warning(f"No active vectors found for doc={doc_id} org={org_id} to archive")
            return 0
        
        batch = self.db.batch()
        count = 0
        total = 0
        
        for doc in docs:
            batch.update(doc.reference, {
                'archived': True,
                'archived_at': datetime.now(timezone.utc)
            })
            count += 1
            total += 1
            if count >= settings.FIRESTORE_BATCH_SIZE:
                await batch.commit()
                batch = self.db.batch()
                count = 0
        
        if count > 0:
            await batch.commit()
        
        logger.info(f"Archived {total} vectors for doc={doc_id} org={org_id}")
        return total

    async def restore_vectors(self, org_id: str, doc_id: str) -> int:
        """
        Restore vectors by setting archived=False flag.
        
        SECURITY: org_id filter ensures only organization's vectors are restored.
        """
        query = (
            self.db.collection(settings.VECTOR_STORE_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
            .where("parent_doc_id", "==", doc_id)
            .where("archived", "==", True)
        )
        
        docs = [doc async for doc in query.stream()]
        
        if not docs:
            logger.warning(f"No archived vectors found for doc={doc_id} org={org_id} to restore")
            return 0
        
        batch = self.db.batch()
        count = 0
        total = 0
        
        for doc in docs:
            batch.update(doc.reference, {
                'archived': False,
                'archived_at': firestore.DELETE_FIELD
            })
            count += 1
            total += 1
            if count >= settings.FIRESTORE_BATCH_SIZE:
                await batch.commit()
                batch = self.db.batch()
                count = 0
        
        if count > 0:
            await batch.commit()
        
        logger.info(f"Restored {total} vectors for doc={doc_id} org={org_id}")
        return total

    # --- Migration Helper Methods ---
    
    async def migrate_add_org_id(self, default_org_id: str) -> dict:
        """
        MIGRATION: Add org_id to all existing vectors.
        
        Should be run ONCE during migration to multi-tenancy.
        """
        query = self.db.collection(settings.VECTOR_STORE_COLLECTION).limit(500)
        
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
        
        logger.info(f"Vector migration: {migrated} updated, {skipped} already had org_id")
        return {'migrated': migrated, 'skipped': skipped, 'default_org_id': default_org_id}
