"""
Handoff router for managing human handoff requests.

MULTI-TENANCY: All operations are scoped to the user's organization.
"""
import time
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Request, Depends, HTTPException, status

from ..config import settings, logger
from ..dependencies import require_read_access, require_write_access, UserContext
from ..utils.limiter import limiter
from ..providers.database.handoff import handoff_provider


router = APIRouter(prefix="/api/v1/handoffs", tags=["handoffs"])


# =============================================================================
# Request/Response Models
# =============================================================================

class AnswerHandoffRequest(BaseModel):
    """Request body for answering a handoff."""
    answer: str = Field(..., min_length=1, max_length=10000, description="Human-provided answer")


class DismissHandoffRequest(BaseModel):
    """Request body for dismissing a handoff."""
    reason: Optional[str] = Field(None, max_length=500, description="Optional reason for dismissal")


class HandoffResponse(BaseModel):
    """Response model for a single handoff."""
    id: str
    org_id: str
    query: str
    context_chunks: list = []
    similarity_score: float = 0.0
    llm_response: str = ""
    confidence: int = 0
    session_id: str = ""
    status: str
    answer: Optional[str] = None
    answered_by: Optional[str] = None
    answered_at: Optional[str] = None
    created_at: str
    metadata: dict = {}


# =============================================================================
# Endpoints
# =============================================================================

@router.get("")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def list_handoffs(
    request: Request,
    status: Optional[str] = None,
    limit: int = 100,
    user: UserContext = Depends(require_read_access),
):
    """
    List handoff requests for the user's organization.
    
    Returns handoffs ordered by: pending first, then by created_at descending.
    
    MULTI-TENANCY: Only returns handoffs for user's org_id.
    
    Query params:
    - status: Filter by status ("pending", "answered", "dismissed")
    - limit: Maximum number of results (default: 100)
    """
    start_time = time.perf_counter()
    
    # Validate status
    if status and status not in ["pending", "answered", "dismissed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be: pending, answered, or dismissed"
        )
    
    handoffs = await handoff_provider.get_handoffs(
        org_id=user.org_id,
        status=status,
        limit=min(limit, 500),
    )
    
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Listed {len(handoffs)} handoffs for org={user.org_id} | {elapsed:.1f}ms")
    
    return {
        "status": "success",
        "handoffs": handoffs,
        "count": len(handoffs),
    }


@router.get("/stats")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_handoff_stats(
    request: Request,
    user: UserContext = Depends(require_read_access),
):
    """
    Get handoff statistics for the user's organization.
    
    Returns:
    - total: Total handoff requests
    - pending: Awaiting answer
    - answered: Answered by admin
    - dismissed: Dismissed without answer
    """
    start_time = time.perf_counter()
    
    stats = await handoff_provider.get_handoff_stats(user.org_id)
    
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Handoff stats for org={user.org_id}: {stats} | {elapsed:.1f}ms")
    
    return {
        "status": "success",
        "stats": stats,
    }


@router.get("/{handoff_id}")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_handoff(
    request: Request,
    handoff_id: str,
    user: UserContext = Depends(require_read_access),
):
    """
    Get a specific handoff request by ID.
    
    MULTI-TENANCY: Verifies handoff belongs to user's organization.
    """
    handoff = await handoff_provider.get_handoff(user.org_id, handoff_id)
    
    if not handoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Handoff not found or access denied"
        )
    
    return {
        "status": "success",
        "handoff": handoff,
    }


@router.post("/{handoff_id}/answer")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def answer_handoff(
    request: Request,
    handoff_id: str,
    body: AnswerHandoffRequest,
    user: UserContext = Depends(require_write_access),
):
    """
    Answer a pending handoff request.
    
    Only admins with write access can answer handoffs.
    
    MULTI-TENANCY: Verifies handoff belongs to user's organization.
    """
    start_time = time.perf_counter()
    
    success = await handoff_provider.answer_handoff(
        org_id=user.org_id,
        handoff_id=handoff_id,
        answer=body.answer,
        answered_by=user.username,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to answer handoff. It may not exist, not be pending, or access denied."
        )
    
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Handoff {handoff_id} answered by {user.username} for org={user.org_id} | {elapsed:.1f}ms"
    )
    
    return {
        "status": "success",
        "message": "Handoff answered successfully",
        "handoff_id": handoff_id,
    }


@router.post("/{handoff_id}/dismiss")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def dismiss_handoff(
    request: Request,
    handoff_id: str,
    body: Optional[DismissHandoffRequest] = None,
    user: UserContext = Depends(require_write_access),
):
    """
    Dismiss a pending handoff request without answering.
    
    Only admins with write access can dismiss handoffs.
    
    MULTI-TENANCY: Verifies handoff belongs to user's organization.
    """
    start_time = time.perf_counter()
    
    success = await handoff_provider.dismiss_handoff(
        org_id=user.org_id,
        handoff_id=handoff_id,
        dismissed_by=user.username,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to dismiss handoff. It may not exist, not be pending, or access denied."
        )
    
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Handoff {handoff_id} dismissed by {user.username} for org={user.org_id} | {elapsed:.1f}ms"
    )
    
    return {
        "status": "success",
        "message": "Handoff dismissed successfully",
        "handoff_id": handoff_id,
    }
