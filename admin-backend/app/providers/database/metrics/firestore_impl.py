"""
Firestore implementation for metrics storage.

Uses firebase-admin SDK with AsyncClient for non-blocking I/O.

MULTI-TENANCY: All operations are scoped to org_id for data isolation.
Each organization has their own metrics document.
"""
from datetime import datetime, timezone, timedelta
from typing import List
import asyncio

from google.cloud.firestore import AsyncClient
from google.cloud.firestore_v1 import Query
from google.cloud.firestore_v1.transforms import Increment

from ....config import settings, logger
from ..firestore_init import get_db
from .interface import MetricsProviderInterface


class FirestoreMetricsProvider(MetricsProviderInterface):
    """
    Firestore implementation for metrics storage.
    
    MULTI-TENANCY: Uses org-specific documents for metrics.
    Each organization has their own dashboard metrics: metrics/{org_id}_dashboard
    """
    
    @property
    def db(self) -> AsyncClient:
        return get_db()

    def _get_metrics_doc_id(self, org_id: str) -> str:
        """Get org-specific metrics document ID."""
        return f"{org_id}_dashboard"
    
    def _get_weekly_doc_id(self, org_id: str, date_str: str) -> str:
        """Get org-specific weekly metrics document ID."""
        return f"{org_id}_{date_str}"

    async def get_metrics(self, org_id: str) -> dict:
        """Get dashboard metrics for a specific organization."""
        doc_id = self._get_metrics_doc_id(org_id)
        doc = await self.db.collection(settings.METRICS_COLLECTION).document(doc_id).get()
        if doc.exists:
            data = doc.to_dict()
            data['org_id'] = org_id  # Include org_id in response
            return data
        return {
            "org_id": org_id,
            "total_documents": 0, 
            "active_documents": 0, 
            "archived_documents": 0
        }

    async def update_metrics(self, org_id: str, updates: dict = None) -> bool:
        """Update metrics for a specific organization with provided updates or perform full recalculation."""
        doc_id = self._get_metrics_doc_id(org_id)
        
        if updates is None:
            # Full recalculation - WARNING: This is expensive and should only be used for maintenance
            from ..metadata import metadata_provider
            counts = await metadata_provider.get_document_count(org_id)
            total_size = await self.calculate_total_size(org_id)
            updates = {
                "org_id": org_id,
                "total_documents": counts["active_documents"] + counts["archived_documents"],
                "active_documents": counts["active_documents"],
                "archived_documents": counts["archived_documents"],
                "total_vectors": counts["vector_store"],
                "total_size_bytes": total_size,
                "last_updated": datetime.now(timezone.utc)
            }
        else:
            updates["org_id"] = org_id
            updates["last_updated"] = datetime.now(timezone.utc)
        
        await self.db.collection(settings.METRICS_COLLECTION).document(doc_id).set(
            updates, merge=True
        )
        logger.debug(f"Updated metrics for org={org_id}")
        return True
    
    async def increment_document_counts(self, org_id: str, active_delta: int = 0, archived_delta: int = 0, vectors_delta: int = 0) -> None:
        """Atomically increment document counters for a specific organization."""
        doc_id = self._get_metrics_doc_id(org_id)
        updates = {"org_id": org_id}
        total_delta = active_delta + archived_delta
        
        if active_delta != 0:
            updates["active_documents"] = Increment(active_delta)
        
        if archived_delta != 0:
            updates["archived_documents"] = Increment(archived_delta)
            
        if total_delta != 0:
            updates["total_documents"] = Increment(total_delta)
            
        if vectors_delta != 0:
            updates["total_vectors"] = Increment(vectors_delta)
            
        if len(updates) > 1:  # More than just org_id
            updates["last_updated"] = datetime.now(timezone.utc)
            await self.db.collection(settings.METRICS_COLLECTION).document(doc_id).set(
                updates, merge=True
            )

    async def increment_daily_hit(self, org_id: str, date_str: str = None) -> None:
        """Increment hits for a specific date for a specific organization."""
        if date_str is None:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        doc_id = self._get_weekly_doc_id(org_id, date_str)
        doc_ref = self.db.collection(settings.WEEKLY_METRICS_COLLECTION).document(doc_id)
        await doc_ref.set({
            "org_id": org_id,
            "date": date_str,
            "hits": Increment(1)
        }, merge=True)

    async def get_weekly_metrics(self, org_id: str, days: int = 7) -> List[dict]:
        """Get weekly metrics for the last N days for a specific organization."""
        now = datetime.now(timezone.utc)
        dates = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days-1, -1, -1)]
        
        async def get_hits(date_str: str) -> dict:
            doc_id = self._get_weekly_doc_id(org_id, date_str)
            doc = await self.db.collection(settings.WEEKLY_METRICS_COLLECTION).document(doc_id).get()
            hits = doc.to_dict().get("hits", 0) if doc.exists else 0
            
            # Convert YYYY-MM-DD to DD/MM/YYYY
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            formatted_date = date_obj.strftime("%d/%m/%Y")
            
            return {
                "date": formatted_date,
                "hits": hits,
                "queries": hits,
                "count": hits
            }
        
        results = await asyncio.gather(*[get_hits(date_str) for date_str in dates])
        return list(results)

    async def calculate_total_size(self, org_id: str) -> int:
        """Calculate total size of all documents for a specific organization."""
        total_size = 0
        query = (
            self.db.collection(settings.DOCUMENTS_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
        )
        async for doc in query.stream():
            data = doc.to_dict()
            total_size += data.get("size", 0) or data.get("file_size", 0) or 0
        return total_size

    async def update_total_size(self, org_id: str, size_delta: int = None) -> None:
        """Update total_size_bytes in metrics for a specific organization."""
        doc_id = self._get_metrics_doc_id(org_id)
        if size_delta is None:
            total_size = await self.calculate_total_size(org_id)
            await self.db.collection(settings.METRICS_COLLECTION).document(doc_id).set(
                {"org_id": org_id, "total_size_bytes": total_size},
                merge=True
            )
        else:
            await self.db.collection(settings.METRICS_COLLECTION).document(doc_id).set(
                {"org_id": org_id, "total_size_bytes": Increment(size_delta)},
                merge=True
            )

    async def backup_system_instructions(self, org_id: str, content: str, backed_up_by: str) -> str:
        """Backup system instructions to history for a specific organization."""
        data = {
            "org_id": org_id,  # CRITICAL: Always set org_id
            "content": content,
            "backed_up_by": backed_up_by,
            "backed_up_at": datetime.now(timezone.utc)
        }
        ref = self.db.collection(settings.SYSTEM_INSTRUCTIONS_HISTORY_COLLECTION).document()
        await ref.set(data)
        logger.debug(f"Backed up system instructions for org={org_id}")
        return ref.id

    async def get_system_instructions_history(self, org_id: str, limit: int = 50) -> List[dict]:
        """Get system instructions history for a specific organization."""
        query = (
            self.db.collection(settings.SYSTEM_INSTRUCTIONS_HISTORY_COLLECTION)
            .where("org_id", "==", org_id)  # CRITICAL: Organization filter
            .order_by("backed_up_at", direction=Query.DESCENDING)
            .limit(limit)
        )
        
        results = []
        async for doc in query.stream():
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(data)
        
        return results

    # --- Migration Helper Methods ---
    
    async def migrate_add_org_id(self, default_org_id: str) -> dict:
        """
        MIGRATION: Add org_id to existing metrics and weekly metrics.
        
        Should be run ONCE during migration to multi-tenancy.
        """
        results = {'metrics': 0, 'weekly': 0, 'instructions': 0}
        
        # Migrate dashboard metrics
        old_doc = await self.db.collection(settings.METRICS_COLLECTION).document("dashboard").get()
        if old_doc.exists:
            data = old_doc.to_dict()
            data['org_id'] = default_org_id
            new_doc_id = self._get_metrics_doc_id(default_org_id)
            await self.db.collection(settings.METRICS_COLLECTION).document(new_doc_id).set(data)
            results['metrics'] = 1
        
        # Migrate weekly metrics
        query = self.db.collection(settings.WEEKLY_METRICS_COLLECTION).limit(500)
        batch = self.db.batch()
        count = 0
        
        async for doc in query.stream():
            data = doc.to_dict()
            if 'org_id' not in data:
                # Extract date from doc.id or use as-is
                date_str = doc.id
                new_doc_id = self._get_weekly_doc_id(default_org_id, date_str)
                data['org_id'] = default_org_id
                data['date'] = date_str
                batch.set(self.db.collection(settings.WEEKLY_METRICS_COLLECTION).document(new_doc_id), data)
                count += 1
                results['weekly'] += 1
                
                if count >= settings.FIRESTORE_BATCH_SIZE:
                    await batch.commit()
                    batch = self.db.batch()
                    count = 0
        
        if count > 0:
            await batch.commit()
        
        # Migrate system instructions history
        query = self.db.collection(settings.SYSTEM_INSTRUCTIONS_HISTORY_COLLECTION).limit(500)
        batch = self.db.batch()
        count = 0
        
        async for doc in query.stream():
            data = doc.to_dict()
            if 'org_id' not in data:
                batch.update(doc.reference, {'org_id': default_org_id})
                count += 1
                results['instructions'] += 1
                
                if count >= settings.FIRESTORE_BATCH_SIZE:
                    await batch.commit()
                    batch = self.db.batch()
                    count = 0
        
        if count > 0:
            await batch.commit()
        
        logger.info(f"Metrics migration complete: {results}")
        return results
