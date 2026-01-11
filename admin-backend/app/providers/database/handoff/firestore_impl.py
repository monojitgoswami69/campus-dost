"""
Firestore implementation for handoff provider.

Uses firebase-admin SDK with AsyncClient for non-blocking I/O.

MULTI-TENANCY: All operations are scoped to org_id for data isolation.
Each organization can only access their own handoff requests.

COLLECTION: handoff_requests
DOCUMENT STRUCTURE:
{
    "id": str,  # Unique handoff ID
    "org_id": str,  # Organization ID for multi-tenancy
    "query": str,  # User's original question
    "context_chunks": list[dict],  # Retrieved RAG context
    "similarity_score": float,  # Highest similarity score from RAG
    "llm_response": str,  # LLM's response before handoff
    "confidence": int,  # LLM's confidence score (0-100)
    "session_id": str,  # Chat session ID for context
    "status": str,  # "pending", "answered", "dismissed"
    "answer": str | None,  # Human-provided answer
    "answered_by": str | None,  # Admin who answered
    "answered_at": timestamp | None,  # When answered
    "created_at": timestamp,  # When handoff was created
    "metadata": dict  # Additional metadata
}

REQUIRED INDEX: handoff_requests (org_id ASC, status ASC, created_at DESC)
Create at: Firebase Console > Firestore > Indexes > Add Index
"""
from datetime import datetime, timezone
from typing import List, Optional

from google.cloud.firestore import AsyncClient
from google.cloud.firestore_v1 import Query
from google.api_core.exceptions import FailedPrecondition

from ....config import settings, logger
from ..firestore_init import get_db
from .interface import HandoffProviderInterface


class FirestoreHandoffProvider(HandoffProviderInterface):
    """
    Firestore implementation for handoff operations.
    
    MULTI-TENANCY: Uses Single Collection Strategy with org_id filtering.
    All queries MUST include org_id to ensure data isolation.
    """
    
    COLLECTION_NAME = "handoff_requests"
    
    @property
    def db(self) -> AsyncClient:
        return get_db()
    
    async def get_handoffs(
        self,
        org_id: str,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        """
        Get handoff requests for an organization.
        
        Orders by: pending first, then by created_at descending.
        
        SECURITY: org_id filter prevents cross-org access.
        """
        try:
            collection_ref = self.db.collection(self.COLLECTION_NAME)
            
            # Build query with org_id filter
            query = collection_ref.where("org_id", "==", org_id)
            
            if status:
                query = query.where("status", "==", status)
            
            # Order by status (pending first) then by created_at descending
            query = query.order_by("created_at", direction=Query.DESCENDING)
            query = query.limit(limit)
            
            results = []
            async for doc in query.stream():
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Convert timestamps to ISO format
                for ts_field in ["created_at", "answered_at"]:
                    if data.get(ts_field) and hasattr(data[ts_field], 'isoformat'):
                        data[ts_field] = data[ts_field].isoformat()
                    elif data.get(ts_field):
                        data[ts_field] = str(data[ts_field])
                
                results.append(data)
            
            # Sort: pending first, then by created_at (most recent first)
            def sort_key(h):
                status_order = {"pending": 0, "answered": 1, "dismissed": 2}
                return (
                    status_order.get(h.get("status", "pending"), 99),
                    h.get("created_at", "") if h.get("created_at") else "",
                )
            
            results.sort(key=lambda h: (
                0 if h.get("status") == "pending" else 1,
                h.get("created_at", "") or ""
            ), reverse=True)
            
            # Reverse so pending are first, then newest
            pending = [h for h in results if h.get("status") == "pending"]
            others = [h for h in results if h.get("status") != "pending"]
            
            # Sort each group by created_at descending
            pending.sort(key=lambda h: h.get("created_at", ""), reverse=True)
            others.sort(key=lambda h: h.get("created_at", ""), reverse=True)
            
            return pending + others
            
        except FailedPrecondition as e:
            error_msg = str(e)
            if "index" in error_msg.lower():
                logger.error(
                    f"Missing Firestore composite index for handoff_requests. "
                    f"Create index at Firebase Console: handoff_requests (org_id ASC, created_at DESC). "
                    f"Error: {error_msg}"
                )
                return []
            raise
        except Exception as e:
            logger.error(f"Failed to get handoffs for org={org_id}: {e}")
            return []
    
    async def get_handoff(self, org_id: str, handoff_id: str) -> Optional[dict]:
        """
        Get a specific handoff request.
        
        SECURITY: Verifies org_id matches to prevent cross-org access.
        """
        try:
            doc_ref = self.db.collection(self.COLLECTION_NAME).document(handoff_id)
            doc = await doc_ref.get()
            
            if not doc.exists:
                return None
            
            data = doc.to_dict()
            
            # SECURITY: Verify org_id matches
            if data.get("org_id") != org_id:
                logger.warning(
                    f"Cross-org handoff access attempt: requested={org_id}, actual={data.get('org_id')}"
                )
                return None
            
            data['id'] = doc.id
            
            # Convert timestamps
            for ts_field in ["created_at", "answered_at"]:
                if data.get(ts_field) and hasattr(data[ts_field], 'isoformat'):
                    data[ts_field] = data[ts_field].isoformat()
            
            return data
            
        except Exception as e:
            logger.error(f"Failed to get handoff {handoff_id}: {e}")
            return None
    
    async def answer_handoff(
        self,
        org_id: str,
        handoff_id: str,
        answer: str,
        answered_by: str,
    ) -> bool:
        """
        Answer a handoff request.
        
        SECURITY: Verifies org_id before updating.
        """
        try:
            # First verify the handoff belongs to this org
            existing = await self.get_handoff(org_id, handoff_id)
            if not existing:
                logger.warning(f"Handoff not found or access denied: {handoff_id}")
                return False
            
            if existing.get("status") != "pending":
                logger.warning(f"Handoff {handoff_id} is not pending (status: {existing.get('status')})")
                return False
            
            doc_ref = self.db.collection(self.COLLECTION_NAME).document(handoff_id)
            await doc_ref.update({
                "status": "answered",
                "answer": answer,
                "answered_by": answered_by,
                "answered_at": datetime.now(timezone.utc),
            })
            
            logger.info(f"Answered handoff {handoff_id} by {answered_by}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to answer handoff {handoff_id}: {e}")
            return False
    
    async def dismiss_handoff(
        self,
        org_id: str,
        handoff_id: str,
        dismissed_by: str,
    ) -> bool:
        """
        Dismiss a handoff request.
        
        SECURITY: Verifies org_id before updating.
        """
        try:
            # Verify handoff belongs to this org
            existing = await self.get_handoff(org_id, handoff_id)
            if not existing:
                logger.warning(f"Handoff not found or access denied: {handoff_id}")
                return False
            
            if existing.get("status") != "pending":
                logger.warning(f"Handoff {handoff_id} is not pending")
                return False
            
            doc_ref = self.db.collection(self.COLLECTION_NAME).document(handoff_id)
            await doc_ref.update({
                "status": "dismissed",
                "answered_by": dismissed_by,
                "answered_at": datetime.now(timezone.utc),
            })
            
            logger.info(f"Dismissed handoff {handoff_id} by {dismissed_by}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to dismiss handoff {handoff_id}: {e}")
            return False
    
    async def get_handoff_stats(self, org_id: str) -> dict:
        """
        Get handoff statistics for an organization.
        
        Returns counts by status.
        """
        try:
            collection_ref = self.db.collection(self.COLLECTION_NAME)
            query = collection_ref.where("org_id", "==", org_id)
            
            stats = {
                "total": 0,
                "pending": 0,
                "answered": 0,
                "dismissed": 0,
            }
            
            async for doc in query.stream():
                data = doc.to_dict()
                stats["total"] += 1
                status = data.get("status", "pending")
                if status in stats:
                    stats[status] += 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get handoff stats for org={org_id}: {e}")
            return {"total": 0, "pending": 0, "answered": 0, "dismissed": 0}
