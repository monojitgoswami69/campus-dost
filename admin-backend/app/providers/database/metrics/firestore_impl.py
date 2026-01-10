"""
Firestore implementation for metrics storage.

Uses native AsyncClient for non-blocking I/O - no threadpool needed.
"""
from datetime import datetime, timezone, timedelta
from typing import List
import asyncio

from google.cloud import firestore
from google.cloud.firestore_v1 import Query

from ....config import settings
from ..firestore_init import get_db
from .interface import MetricsProviderInterface


class FirestoreMetricsProvider(MetricsProviderInterface):
    """Firestore implementation for metrics storage."""
    
    @property
    def db(self) -> firestore.AsyncClient:
        return get_db()

    async def get_metrics(self) -> dict:
        """Get dashboard metrics."""
        doc = await self.db.collection(settings.METRICS_COLLECTION).document("dashboard").get()
        if doc.exists:
            return doc.to_dict()
        return {"total_documents": 0, "active_documents": 0, "archived_documents": 0}

    async def update_metrics(self, updates: dict = None) -> bool:
        """Update metrics with provided updates or perform full recalculation (EXPENSIVE - use sparingly)."""
        if updates is None:
            # Full recalculation - WARNING: This is expensive and should only be used for maintenance
            # NOT for hot path operations like file uploads
            from ..metadata import metadata_provider
            counts = await metadata_provider.get_document_count()
            total_size = await self.calculate_total_size()
            updates = {
                "total_documents": counts["active_documents"] + counts["archived_documents"],
                "active_documents": counts["active_documents"],
                "archived_documents": counts["archived_documents"],
                "total_vectors": counts["vector_store"],
                "total_size_bytes": total_size,
                "last_updated": datetime.now(timezone.utc)
            }
        else:
            updates["last_updated"] = datetime.now(timezone.utc)
        
        await self.db.collection(settings.METRICS_COLLECTION).document("dashboard").set(
            updates, merge=True
        )
        return True
    
    async def increment_document_counts(self, active_delta: int = 0, archived_delta: int = 0, vectors_delta: int = 0) -> None:
        """Atomically increment document counters without full recalculation."""
        updates = {}
        total_delta = active_delta + archived_delta
        
        if active_delta != 0:
            updates["active_documents"] = firestore.Increment(active_delta)
        
        if archived_delta != 0:
            updates["archived_documents"] = firestore.Increment(archived_delta)
            
        if total_delta != 0:
            updates["total_documents"] = firestore.Increment(total_delta)
            
        if vectors_delta != 0:
            updates["total_vectors"] = firestore.Increment(vectors_delta)
            
        if updates:
            updates["last_updated"] = datetime.now(timezone.utc)
            await self.db.collection(settings.METRICS_COLLECTION).document("dashboard").set(
                updates, merge=True
            )

    async def increment_daily_hit(self, date_str: str = None) -> None:
        """Increment hits for a specific date in weekly_metrics collection."""
        if date_str is None:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        doc_ref = self.db.collection(settings.WEEKLY_METRICS_COLLECTION).document(date_str)
        await doc_ref.set({"hits": firestore.Increment(1)}, merge=True)

    async def get_weekly_metrics(self, days: int = 7) -> List[dict]:
        """Get weekly metrics for the last N days."""
        now = datetime.now(timezone.utc)
        dates = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days-1, -1, -1)]
        
        # Fetch all dates concurrently for better performance
        async def get_hits(date_str: str) -> dict:
            doc = await self.db.collection(settings.WEEKLY_METRICS_COLLECTION).document(date_str).get()
            hits = doc.to_dict().get("hits", 0) if doc.exists else 0
            
            # Convert YYYY-MM-DD to DD/MM/YYYY
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            formatted_date = date_obj.strftime("%d/%m/%Y")  # DD/MM/YYYY format
            
            return {
                "date": formatted_date,      # DD/MM/YYYY format for frontend
                "hits": hits,                # Primary field
                "queries": hits,             # Alias for compatibility
                "count": hits                # Another alias
            }
        
        results = await asyncio.gather(*[get_hits(date_str) for date_str in dates])
        return list(results)

    async def calculate_total_size(self) -> int:
        """Calculate total size of all documents from single collection."""
        total_size = 0
        query = self.db.collection(settings.DOCUMENTS_COLLECTION)
        async for doc in query.stream():
            data = doc.to_dict()
            total_size += data.get("size", 0) or data.get("file_size", 0) or 0
        return total_size

    async def update_total_size(self, size_delta: int = None) -> None:
        """Update total_size_bytes in metrics. If size_delta is None, recalculate from scratch."""
        if size_delta is None:
            total_size = await self.calculate_total_size()
            await self.db.collection(settings.METRICS_COLLECTION).document("dashboard").set(
                {"total_size_bytes": total_size},
                merge=True
            )
        else:
            await self.db.collection(settings.METRICS_COLLECTION).document("dashboard").set(
                {"total_size_bytes": firestore.Increment(size_delta)},
                merge=True
            )

    async def backup_system_instructions(self, content: str, backed_up_by: str) -> str:
        """Backup system instructions to history."""
        data = {
            "content": content,
            "backed_up_by": backed_up_by,
            "backed_up_at": datetime.now(timezone.utc)
        }
        ref = self.db.collection(settings.SYSTEM_INSTRUCTIONS_HISTORY_COLLECTION).document()
        await ref.set(data)
        return ref.id

    async def get_system_instructions_history(self, limit: int = 50) -> List[dict]:
        """Get system instructions history."""
        query = (
            self.db.collection(settings.SYSTEM_INSTRUCTIONS_HISTORY_COLLECTION)
            .order_by("backed_up_at", direction=Query.DESCENDING)
            .limit(limit)
        )
        
        results = []
        async for doc in query.stream():
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(data)
        
        return results
