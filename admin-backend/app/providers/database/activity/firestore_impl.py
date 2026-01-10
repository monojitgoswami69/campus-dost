"""
Firestore implementation for activity logging.

Uses native AsyncClient for non-blocking I/O - no threadpool needed.
"""
from datetime import datetime, timezone
from typing import List

from google.cloud import firestore
from google.cloud.firestore_v1 import Query

from ....config import settings
from ..firestore_init import get_db
from .interface import ActivityProviderInterface


class FirestoreActivityProvider(ActivityProviderInterface):
    """Firestore implementation for activity logging."""
    
    @property
    def db(self) -> firestore.AsyncClient:
        return get_db()

    async def log_activity(self, action: str, actor: str, resource_type: str = None,
                          resource_id: str = None, meta: dict = None) -> str:
        """Log an activity event."""
        data = {
            "action": action, 
            "actor": actor, 
            "resource_type": resource_type,
            "resource_id": resource_id, 
            "meta": meta or {}, 
            "timestamp": datetime.now(timezone.utc)
        }
        ref = self.db.collection(settings.ACTIVITY_LOG_COLLECTION).document()
        await ref.set(data)
        return ref.id

    async def get_activity_log(self, limit: int) -> List[dict]:
        """Get recent activity log entries."""
        query = (
            self.db.collection(settings.ACTIVITY_LOG_COLLECTION)
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
