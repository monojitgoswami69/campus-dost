"""
Chat endpoint with streaming response and hybrid handoff support.

This module provides the main chat API endpoint with:
- Streaming responses (Server-Sent Events compatible)
- RAG (Retrieval Augmented Generation) context
- Hybrid gatekeeper with intelligent handoff decisions
- Request validation
- Rate limiting (configured via main.py)
- Comprehensive OpenAPI documentation
- Background metrics tracking (shared with admin backend)

Usage:
    POST /chat
    {
        "message": "What is machine learning?",
        "history": []
    }
"""
from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING, AsyncIterator

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from fastapi.responses import StreamingResponse, JSONResponse

from app.config import get_logger, settings
from app.exceptions import LLMError
from app.models import ChatRequest, ChatResponse, ErrorResponse
from app.providers.metrics import metrics_provider
from app.services.chat import build_prompt, generate_chat_stream
from app.services.rag import get_rag_context, RAGService
from app.services.hybrid_chat import generate_hybrid_chat
from app.state import AppState, get_app_state

if TYPE_CHECKING:
    from app.models import ChatMessage

logger = get_logger("routes.chat")

router = APIRouter(tags=["Chat"])


# =============================================================================
# Response Headers
# =============================================================================

STREAMING_HEADERS: dict[str, str] = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "X-Accel-Buffering": "no",  # Disable nginx buffering
    "Connection": "keep-alive",
}


# =============================================================================
# Hybrid Chat Endpoint (with Handoff Support)
# =============================================================================

async def chat_endpoint(
    request: Request,
    chat_request: ChatRequest,
    state: AppState = Depends(get_app_state),
) -> StreamingResponse:
    """
    Process chat request with RAG context, hybrid handoff, and stream response.
    
    This endpoint uses the hybrid gatekeeper approach:
    1. ALWAYS retrieves RAG context (even if similarity is low)
    2. ALWAYS calls LLM with structured JSON response format
    3. LLM decides if it can answer or needs human handoff
    4. If handoff needed, creates handoff request in Firestore
    5. Streams the LLM's answer to the user
    
    **Request Body:**
    - `message`: User's message (required, 1-10000 chars)
    - `history`: Conversation history (optional, max 20 messages)
    - `org_id`: Organization ID for multi-tenant filtering (optional)
    
    **Response:**
    - Streams plain text chunks as they are generated
    - Uses `text/plain` media type for broad compatibility
    
    **Headers:**
    - `X-History-Truncated`: Present if history was truncated
    - `X-Handoff-Required`: "true" if query was handed off to human
    - `X-Handoff-Id`: Handoff request ID (if created)
    - `X-Confidence`: LLM confidence score (0-100)
    - `Cache-Control: no-cache`: Prevents caching of streamed content
    
    **Rate Limiting:**
    - Configured via RATE_LIMIT environment variable (default: 100/minute)
    """
    start_time = time.perf_counter()
    
    # Get configuration
    max_history = settings.MAX_HISTORY_MESSAGES
    
    # Prepare history (truncate if needed while preserving pairs)
    history = list(chat_request.history)
    history_truncated = False
    original_history_len = len(history)

    if len(history) > max_history:
        truncate_to = max_history - (max_history % 2)
        logger.warning(
            "History truncated from %d to %d messages - context may be lost",
            len(history),
            truncate_to,
        )
        history = history[-truncate_to:]
        history_truncated = True

    # org_id is now required in the request model
    org_id = chat_request.org_id
    
    logger.info(
        "Chat request | message_len=%d | history_len=%d (truncated=%s) | provider=%s | org=%s",
        len(chat_request.message),
        len(history),
        history_truncated,
        state.llm_provider.get_provider_name(),
        org_id,
    )

    # Validate LLM provider availability
    if not state.llm_provider.is_available():
        provider_name = state.llm_provider.get_provider_name()
        logger.error("LLM provider not available: %s", provider_name)
        raise LLMError(
            message="Chat service temporarily unavailable",
            details=f"Provider {provider_name} is not available",
        )

    # Fetch system instructions from Firestore for this organization
    system_instruction = await state.database_provider.get_system_instructions(org_id)
    if not system_instruction:
        # Fallback to default system instruction from file
        logger.warning("No system instructions in Firestore for org=%s, using default", org_id)
        system_instruction = state.system_instruction
    else:
        logger.info("System instructions fetched from Firestore for org=%s", org_id)

    # ALWAYS get RAG context - don't skip even for low similarity
    # The LLM will decide if it can answer or needs handoff
    rag_start = time.perf_counter()
    
    # Use RAGService directly with lower threshold to always get context
    rag_service = RAGService(state)
    rag_results = await rag_service.get_context(chat_request.message, history, org_id)
    
    rag_elapsed_ms = (time.perf_counter() - rag_start) * 1000
    top_score = rag_results[0].score if rag_results else 0.0

    logger.info(
        "RAG complete | results=%d | top_score=%.3f | elapsed_ms=%.1f | org_id=%s",
        len(rag_results),
        top_score,
        rag_elapsed_ms,
        org_id,
    )

    # Get session ID from request body
    session_id = chat_request.session_id
    
    # Use hybrid chat service - LLM decides handoff
    # The system instruction is combined with handoff JSON schema instructions inside HybridChatService
    hybrid_result = await generate_hybrid_chat(
        user_message=chat_request.message,
        rag_results=rag_results,
        history=history,
        system_instruction=system_instruction,
        llm_provider=state.llm_provider,
        org_id=org_id,
        session_id=session_id,
        org_name=org_id.upper(),  # Use org_id as name
    )
    
    logger.info(
        "Hybrid chat complete | handoff=%s | confidence=%d | answer_len=%d | handoff_id=%s",
        hybrid_result.handoff_required,
        hybrid_result.confidence,
        len(hybrid_result.answer),
        hybrid_result.handoff_id,
    )

    async def stream_response() -> AsyncIterator[str]:
        """Stream the response with typing effect."""
        chunk_count = 0
        bytes_sent = 0
        gen_start = time.perf_counter()
        success = False

        try:
            # Stream the answer in small chunks for typing effect
            answer = hybrid_result.answer
            chunk_size = 8
            for i in range(0, len(answer), chunk_size):
                chunk = answer[i:i + chunk_size]
                chunk_count += 1
                bytes_sent += len(chunk.encode("utf-8"))
                yield chunk
                # Small delay for natural typing effect
                await asyncio.sleep(0.01)
            
            success = True

        finally:
            gen_elapsed_ms = (time.perf_counter() - gen_start) * 1000
            total_elapsed_ms = (time.perf_counter() - start_time) * 1000

            logger.info(
                "Stream complete | chunks=%d | bytes=%d | gen_ms=%.1f | total_ms=%.1f | success=%s",
                chunk_count,
                bytes_sent,
                gen_elapsed_ms,
                total_elapsed_ms,
                success,
            )
            
            # Track metrics
            if success and chunk_count > 0:
                asyncio.create_task(metrics_provider.increment_daily_hit())

    # Build response headers
    headers = dict(STREAMING_HEADERS)
    
    if history_truncated:
        headers["X-History-Truncated"] = (
            f"true;original={original_history_len};kept={len(history)}"
        )
    
    # Add handoff information headers
    headers["X-Handoff-Required"] = str(hybrid_result.handoff_required).lower()
    headers["X-Confidence"] = str(hybrid_result.confidence)
    if hybrid_result.handoff_id:
        headers["X-Handoff-Id"] = hybrid_result.handoff_id

    return StreamingResponse(
        content=stream_response(),
        media_type="text/plain",
        headers=headers,
    )


# =============================================================================
# Non-Streaming Chat Endpoint (JSON Response)
# =============================================================================

async def chat_json_endpoint(
    request: Request,
    chat_request: ChatRequest,
    state: AppState = Depends(get_app_state),
) -> ChatResponse:
    """
    Process chat request and return JSON response with handoff info.
    
    Non-streaming alternative for clients that need handoff information
    in the response body rather than headers.
    
    **Request Body:**
    - `message`: User's message (required)
    - `history`: Conversation history (optional)
    - `org_id`: Organization ID (required)
    - `session_id`: Session ID for conversation tracking (optional)
    
    **Response:**
    - `message`: Bot's response
    - `handoff_required`: Whether query needs human attention
    - `handoff_id`: Handoff request ID (if created)
    - `confidence`: LLM confidence score (0-100)
    """
    # Get configuration
    max_history = settings.MAX_HISTORY_MESSAGES
    history = list(chat_request.history)
    
    if len(history) > max_history:
        truncate_to = max_history - (max_history % 2)
        history = history[-truncate_to:]

    # org_id is now required in the request model
    org_id = chat_request.org_id
    
    # Validate LLM provider
    if not state.llm_provider.is_available():
        raise LLMError(
            message="Chat service temporarily unavailable",
            details=f"Provider {state.llm_provider.get_provider_name()} is not available",
        )

    # Fetch system instructions from Firestore for this organization
    system_instruction = await state.database_provider.get_system_instructions(org_id)
    if not system_instruction:
        # Fallback to default system instruction from file
        logger.warning("No system instructions in Firestore for org=%s, using default", org_id)
        system_instruction = state.system_instruction
    else:
        logger.info("System instructions fetched from Firestore for org=%s", org_id)

    # Get RAG context
    rag_service = RAGService(state)
    rag_results = await rag_service.get_context(chat_request.message, history, org_id)
    
    session_id = chat_request.session_id
    
    # Use hybrid chat - system instruction is combined with handoff JSON schema inside service
    result = await generate_hybrid_chat(
        user_message=chat_request.message,
        rag_results=rag_results,
        history=history,
        system_instruction=system_instruction,
        llm_provider=state.llm_provider,
        org_id=org_id,
        session_id=session_id,
        org_name=org_id.upper(),
    )
    
    # Track metrics
    asyncio.create_task(metrics_provider.increment_daily_hit())
    
    return ChatResponse(
        message=result.answer,
        handoff_required=result.handoff_required,
        handoff_id=result.handoff_id,
        confidence=result.confidence,
    )


# =============================================================================
# OpenAPI Documentation
# =============================================================================

__all__ = [
    "chat_endpoint",
    "chat_json_endpoint",
    "ChatRequest",
    "ChatResponse",
    "Depends",
    "get_app_state",
]
