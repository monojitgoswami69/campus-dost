"""
Session management endpoints.

Provides basic session tracking for the chatbot.
Sessions are currently stateless but can be extended for persistence.
"""
from fastapi import APIRouter, Request, status
from pydantic import BaseModel, Field

from app.config import get_logger

logger = get_logger("routes.session")

router = APIRouter(tags=["Session"])


class SessionStartRequest(BaseModel):
    """Request model for starting a session."""
    session_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique session identifier from client"
    )


class SessionStartResponse(BaseModel):
    """Response model for session start."""
    status: str
    session_id: str
    message: str


@router.post(
    "/session/start",
    response_model=SessionStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Start a chat session",
    description="Initialize a new chat session. Currently stateless but logs session start."
)
async def start_session(request: Request, session_request: SessionStartRequest) -> SessionStartResponse:
    """
    Start a new chat session.
    
    **Request Body:**
    - `session_id`: Unique session identifier from client
    
    **Response:**
    - `status`: "success"
    - `session_id`: Echo of the session ID
    - `message`: Confirmation message
    
    **Notes:**
    - Sessions are currently stateless
    - Session ID is used for tracking in logs and metrics
    - Future enhancement: persist session state in database
    """
    logger.info(f"Session started: {session_request.session_id}")
    
    return SessionStartResponse(
        status="success",
        session_id=session_request.session_id,
        message="Session started successfully"
    )


@router.post(
    "/session/end",
    response_model=SessionStartResponse,
    status_code=status.HTTP_200_OK,
    summary="End a chat session",
    description="Close an existing chat session. Currently stateless but logs session end."
)
async def end_session(request: Request, session_request: SessionStartRequest) -> SessionStartResponse:
    """
    End an existing chat session.
    
    **Request Body:**
    - `session_id`: Session identifier to close
    
    **Response:**
    - `status`: "success"
    - `session_id`: Echo of the session ID
    - `message`: Confirmation message
    """
    logger.info(f"Session ended: {session_request.session_id}")
    
    return SessionStartResponse(
        status="success",
        session_id=session_request.session_id,
        message="Session ended successfully"
    )
