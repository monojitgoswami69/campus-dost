"""
Handoff routes for the chatbot-backend.

Provides endpoints for users to submit their email for handoff requests.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.config import get_logger
from app.providers.handoff import handoff_provider

logger = get_logger("routes.handoff")

router = APIRouter(prefix="/handoff", tags=["Handoff"])


class EmailSubmission(BaseModel):
    """Email submission for handoff request."""
    email: EmailStr
    org_id: Optional[str] = None


class EmailSubmissionResponse(BaseModel):
    """Response after email submission."""
    success: bool
    message: str
    handoff_id: str


@router.post(
    "/{handoff_id}/email",
    response_model=EmailSubmissionResponse,
    summary="Submit email for handoff request",
    description="Submit user's email address for a handoff request so admin can respond",
)
async def submit_handoff_email(
    handoff_id: str,
    body: EmailSubmission,
) -> EmailSubmissionResponse:
    """
    Submit email for a handoff request.
    
    This allows users to provide their email when a handoff is triggered,
    so the admin can send the answer to them later.
    """
    try:
        # Update the handoff request with the email
        success = await handoff_provider.add_email_to_handoff(handoff_id, body.email)
        
        if success:
            logger.info("Email submitted for handoff %s: %s", handoff_id, body.email)
            return EmailSubmissionResponse(
                success=True,
                message="Email submitted successfully. You will receive a response soon.",
                handoff_id=handoff_id
            )
        else:
            logger.warning("Failed to add email to handoff %s", handoff_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Handoff request not found"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error submitting email for handoff %s: %s", handoff_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit email"
        )
