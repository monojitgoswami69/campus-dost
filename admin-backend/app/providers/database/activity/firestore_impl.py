"""
Firestore implementation for activity logging.

Uses firebase-admin SDK with AsyncClient for non-blocking I/O.

MULTI-TENANCY: All operations are scoped to org_id for data isolation.
Each organization can only access their own activity logs.
"""
from datetime import datetime, timezone
from typing import List

from google.cloud.firestore import AsyncClient
from google.cloud.firestore_v1 import Query
from google.api_core.exceptions import FailedPrecondition

from ....config import settings, logger
from ..firestore_init import get_db
from .interface import ActivityProviderInterface


class FirestoreActivityProvider(ActivityProviderInterface):
    """
    Firestore implementation for activity logging.
    
    MULTI-TENANCY: Uses Single Collection Strategy with org_id filtering.
    All queries MUST include org_id to ensure data isolation between organizations.
    
    REQUIRED INDEX: activity_log (org_id ASC, timestamp DESC)
    Create at: Firebase Console > Firestore > Indexes > Add Index
    """
    
    @property
    def db(self) -> AsyncClient:
        return get_db()

    async def log_activity(self, org_id: str, action: str, actor: str, resource_type: str = None,
                          resource_id: str = None, meta: dict = None) -> str:
        """
        Log an activity event with organization scope.
        
        SECURITY: org_id is ALWAYS injected - never from user input.
        """
        data = {
            "org_id": org_id,  # CRITICAL: Always set org_id
            "action": action, 
            "actor": actor, 
            "resource_type": resource_type,
            "resource_id": resource_id, 
            "meta": meta or {}, 
            "timestamp": datetime.now(timezone.utc)
        }
        ref = self.db.collection(settings.ACTIVITY_LOG_COLLECTION).document()
        await ref.set(data)
        logger.debug(f"Logged activity: {action} by {actor} for org={org_id}")
        return ref.id

    async def get_activity_log(self, org_id: str, limit: int) -> List[dict]:
        """
        Get recent activity log entries filtered by organization.
        
        SECURITY: org_id filter prevents cross-org access.
        
        REQUIRED INDEX: Composite index on (org_id ASC, timestamp DESC)
        If missing, will return empty list with warning instead of crashing.
        """
        try:
            query = (
                self.db.collection(settings.ACTIVITY_LOG_COLLECTION)
                .where("org_id", "==", org_id)  # CRITICAL: Organization filter
                .order_by("timestamp", direction=Query.DESCENDING)
                .limit(limit)
            )
            
            results = []
            async for doc in query.stream():
                data = doc.to_dict()
                data['id'] = doc.id
                ts = data.get('timestamp')
                data['timestamp'] = ts.isoformat() if hasattr(ts, 'isoformat') else str(ts) if ts else ''
                results.append(data)
            
            return results
            
        except FailedPrecondition as e:
            # Missing composite index - graceful degradation
            error_msg = str(e)
            if "index" in error_msg.lower():
                logger.error(
                    f"Missing Firestore composite index for activity_log. "
                    f"Create index at Firebase Console: activity_log (org_id ASC, timestamp DESC). "
                    f"Error: {error_msg}"
                )
                # Return empty list instead of crashing - allows app to function
                return []
            raise

    # --- Migration Helper Methods ---
    
    async def migrate_add_org_id(self, default_org_id: str) -> dict:
        """
        MIGRATION: Add org_id to all existing activity logs.
        
        Should be run ONCE during migration to multi-tenancy.
        """
        query = self.db.collection(settings.ACTIVITY_LOG_COLLECTION).limit(500)
        
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
        
        logger.info(f"Activity log migration: {migrated} updated, {skipped} already had org_id")
        return {'migrated': migrated, 'skipped': skipped, 'default_org_id': default_org_id}
