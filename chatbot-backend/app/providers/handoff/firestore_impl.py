"""
Firestore Handoff Provider implementation.

Provides functionality to store human handoff requests when the
chatbot cannot answer queries from available context.

Features:
- Async Firestore operations
- Multi-tenant support with org_id
- Stores query, context, and metadata for human review
"""
from __future__ import annotations

import asyncio
import base64
import json
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from google.cloud import firestore
from google.oauth2 import service_account

from ...config import settings, get_logger
from ...utils import is_retryable_error

logger = get_logger("providers.handoff")


class FirestoreHandoffProvider:
    """
    Firestore provider for storing human handoff requests.
    
    Collection: handoff_requests (configurable)
    Document structure:
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
    """
    
    COLLECTION_NAME = "handoff_requests"
    
    def __init__(self):
        self._client: Optional[firestore.AsyncClient] = None
        self._initialized = False
        self._credentials = None
    
    async def _ensure_initialized(self) -> bool:
        """
        Ensure Firestore client is initialized.
        
        Lazily initializes the client on first use.
        """
        if self._initialized and self._client:
            return True
        
        try:
            if settings.FIREBASE_CREDS_BASE64:
                padded = settings.FIREBASE_CREDS_BASE64 + "=" * (
                    (4 - len(settings.FIREBASE_CREDS_BASE64) % 4) % 4
                )
                cred_json = base64.b64decode(padded).decode("utf-8")
                info = json.loads(cred_json)
                self._credentials = service_account.Credentials.from_service_account_info(info)
                self._client = firestore.AsyncClient(credentials=self._credentials)
            else:
                self._client = firestore.AsyncClient()
            
            self._initialized = True
            logger.debug("Handoff Firestore client initialized")
            return True
            
        except Exception as e:
            logger.error("Failed to initialize handoff Firestore client: %s", e)
            return False
    
    async def create_handoff(
        self,
        org_id: str,
        query: str,
        context_chunks: list[dict],
        similarity_score: float,
        llm_response: str,
        confidence: int,
        session_id: str | None = None,
        metadata: dict | None = None,
    ) -> str | None:
        """
        Create a new human handoff request.
        
        Args:
            org_id: Organization ID for multi-tenancy
            query: User's original question
            context_chunks: Retrieved RAG context chunks
            similarity_score: Highest similarity score from RAG
            llm_response: LLM's response before handoff
            confidence: LLM's confidence score (0-100)
            session_id: Chat session ID for context
            metadata: Additional metadata
            
        Returns:
            Handoff ID if successful, None otherwise
        """
        if not await self._ensure_initialized():
            logger.warning("Handoff provider not initialized, skipping create")
            return None
        
        try:
            handoff_id = str(uuid4())
            doc_data = {
                "id": handoff_id,
                "org_id": org_id,
                "query": query,
                "context_chunks": context_chunks,
                "similarity_score": similarity_score,
                "llm_response": llm_response,
                "confidence": confidence,
                "session_id": session_id or "",
                "status": "pending",
                "answer": None,
                "answered_by": None,
                "answered_at": None,
                "created_at": datetime.now(timezone.utc),
                "metadata": metadata or {},
            }
            
            doc_ref = self._client.collection(self.COLLECTION_NAME).document(handoff_id)
            await doc_ref.set(doc_data)
            
            logger.info(
                "Created handoff request: id=%s org_id=%s query_len=%d confidence=%d",
                handoff_id, org_id, len(query), confidence
            )
            return handoff_id
            
        except Exception as e:
            logger.error("Failed to create handoff request: %s", e)
            return None
    
    async def get_handoff(self, handoff_id: str) -> dict | None:
        """Get a specific handoff request by ID."""
        if not await self._ensure_initialized():
            return None
        
        try:
            doc_ref = self._client.collection(self.COLLECTION_NAME).document(handoff_id)
            doc = await doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                # Convert timestamps to ISO format
                for ts_field in ["created_at", "answered_at"]:
                    if data.get(ts_field) and hasattr(data[ts_field], "isoformat"):
                        data[ts_field] = data[ts_field].isoformat()
                return data
            return None
            
        except Exception as e:
            logger.error("Failed to get handoff: %s", e)
            return None
