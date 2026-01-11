"""
Pydantic models for request/response validation and OpenAPI documentation.

This module defines all data transfer objects (DTOs) used in the API:
- Request models with comprehensive validation
- Response models for consistent API outputs
- Internal domain models

Usage:
    from app.models import ChatRequest, ChatMessage, ErrorResponse
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Generic, TypeVar

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.config import settings


# =============================================================================
# Type Variables for Generic Models
# =============================================================================

T = TypeVar("T")


# =============================================================================
# Constants
# =============================================================================

ALLOWED_ROLES: frozenset[str] = frozenset({"user", "model"})


# =============================================================================
# Enums
# =============================================================================

class MessageRole(str, Enum):
    """Valid roles for chat messages."""
    USER = "user"
    MODEL = "model"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ServiceStatus(str, Enum):
    """Status values for health checks."""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


# =============================================================================
# Request Models
# =============================================================================

class ChatMessage(BaseModel):
    """
    Represents a single message in chat history.
    
    Attributes:
        role: The sender role ('user' or 'model')
        parts: List of message content parts
    
    Example:
        >>> msg = ChatMessage(role="user", parts=["Hello, world!"])
    """
    
    model_config = ConfigDict(
        str_strip_whitespace=True,
        frozen=False,
    )
    
    role: str = Field(
        ...,
        description="Message sender role",
        examples=["user", "model"],
    )
    parts: list[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Message content parts",
    )

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate that role is one of the allowed values."""
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Invalid role '{v}'. Must be one of: {ALLOWED_ROLES}")
        return v

    @field_validator("parts")
    @classmethod
    def validate_parts(cls, v: list[str]) -> list[str]:
        """Validate that parts are not empty and within length limits."""
        if not v:
            raise ValueError("Parts list cannot be empty")
        
        max_length = settings.MAX_MESSAGE_LENGTH
        for i, part in enumerate(v):
            if len(part) > max_length:
                raise ValueError(
                    f"Part {i} exceeds max length of {max_length} characters"
                )
        return v


class ChatRequest(BaseModel):
    """
    Incoming chat request payload with comprehensive validation.
    
    Attributes:
        message: The user's message
        history: Previous conversation history
    
    Example:
        >>> request = ChatRequest(
        ...     message="What is Python?",
        ...     history=[
        ...         ChatMessage(role="user", parts=["Hello"]),
        ...         ChatMessage(role="model", parts=["Hi there!"])
        ...     ]
        ... )
    """
    
    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "examples": [
                {
                    "message": "What is machine learning?",
                    "history": []
                },
                {
                    "message": "Can you explain more?",
                    "history": [
                        {"role": "user", "parts": ["What is AI?"]},
                        {"role": "model", "parts": ["AI stands for Artificial Intelligence..."]}
                    ]
                }
            ]
        }
    )
    
    message: str = Field(
        ...,
        min_length=1,
        max_length=settings.MAX_MESSAGE_LENGTH,
        description="User's message to the chatbot",
    )
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=settings.MAX_HISTORY_MESSAGES * 2,
        description="Conversation history (user/model message pairs)",
    )
    org_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Organization ID for multi-tenant filtering (required)",
        examples=["cse", "math", "default"],
    )
    session_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Session ID for conversation tracking (optional)",
    )

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate message is not just whitespace."""
        if not v or not v.strip():
            raise ValueError("Message cannot be empty or whitespace only")
        return v.strip()

    @model_validator(mode="after")
    def validate_history_consistency(self) -> "ChatRequest":
        """
        Validate history consistency.
        
        Rules:
        - First message must be from user
        - Messages must alternate between user and model
        - No consecutive messages from the same role
        """
        if not self.history:
            return self
        
        # Check that first message is from user
        if self.history[0].role != "user":
            raise ValueError("First message in history must be from 'user'")
        
        # Check for alternating roles
        for i in range(1, len(self.history)):
            if self.history[i].role == self.history[i - 1].role:
                raise ValueError(
                    f"Invalid history: consecutive messages from same role "
                    f"at positions {i-1} and {i}"
                )
        
        return self


# =============================================================================
# Response Models
# =============================================================================

class ErrorDetail(BaseModel):
    """Detailed error information."""
    
    model_config = ConfigDict(frozen=True)
    
    code: str = Field(
        ...,
        description="Machine-readable error code",
        examples=["VALIDATION_ERROR", "RATE_LIMIT_EXCEEDED"],
    )
    message: str = Field(
        ...,
        description="Human-readable error message",
    )
    field: str | None = Field(
        default=None,
        description="Field that caused the error (for validation errors)",
    )


class ErrorResponse(BaseModel):
    """
    Standard error response format.
    
    All API errors return this format for consistency.
    """
    
    model_config = ConfigDict(frozen=True)
    
    detail: str = Field(
        ...,
        description="Error message",
    )
    error_type: str = Field(
        ...,
        description="Error classification",
        examples=["ValidationError", "RateLimitError", "LLMError"],
    )
    errors: list[ErrorDetail] | None = Field(
        default=None,
        description="Detailed error information (for validation errors)",
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(),
        description="When the error occurred",
    )


class ServiceHealth(BaseModel):
    """Health status for a single service."""
    
    model_config = ConfigDict(frozen=True)
    
    status: ServiceStatus = Field(
        ...,
        description="Service health status",
    )
    latency_ms: float | None = Field(
        default=None,
        ge=0,
        description="Service response latency in milliseconds",
    )
    details: str | None = Field(
        default=None,
        description="Additional status details",
    )


class HealthResponse(BaseModel):
    """
    Health check response with service statuses.
    
    Example:
        >>> health = HealthResponse(
        ...     status="healthy",
        ...     services={"llm": {"status": "healthy"}},
        ...     timestamp="2024-01-01T00:00:00Z"
        ... )
    """
    
    model_config = ConfigDict(strict=True)
    
    status: str = Field(
        ...,
        description="Overall health status",
        examples=["healthy", "degraded", "unhealthy"],
    )
    services: dict[str, Any] = Field(
        ...,
        description="Individual service health statuses",
    )
    timestamp: str = Field(
        ...,
        description="ISO 8601 timestamp",
    )
    version: str = Field(
        default="3.0.0",
        description="API version",
    )


class ReadinessResponse(BaseModel):
    """Readiness probe response for container orchestration."""
    
    model_config = ConfigDict(frozen=True)
    
    ready: bool = Field(
        ...,
        description="Whether the service is ready to accept requests",
    )
    checks: dict[str, bool] = Field(
        default_factory=dict,
        description="Individual readiness check results",
    )


class PingResponse(BaseModel):
    """Simple ping response."""
    
    model_config = ConfigDict(frozen=True)
    
    status: str = Field(
        default="ok",
        description="Ping status",
    )


# =============================================================================
# Handoff Models
# =============================================================================

class HandoffDecision(BaseModel):
    """
    LLM response structure for handoff decisions.
    
    The LLM returns this JSON structure to indicate whether it can
    answer the question or needs to hand off to a human.
    """
    
    model_config = ConfigDict(frozen=True)
    
    answer: str = Field(
        ...,
        description="The answer or apology message",
    )
    handoff_required: bool = Field(
        default=False,
        description="Whether human handoff is needed",
    )
    confidence: int = Field(
        default=50,
        ge=0,
        le=100,
        description="Confidence score (0-100)",
    )


class ChatResponse(BaseModel):
    """
    Non-streaming chat response with handoff information.
    
    Used for hybrid gatekeeper mode where we need to know
    if handoff is required before streaming.
    """
    
    model_config = ConfigDict(frozen=False)
    
    message: str = Field(
        ...,
        description="The bot's response message",
    )
    handoff_required: bool = Field(
        default=False,
        description="Whether this query was handed off to a human",
    )
    handoff_id: str | None = Field(
        default=None,
        description="Handoff request ID if handoff was created",
    )
    confidence: int = Field(
        default=50,
        ge=0,
        le=100,
        description="LLM confidence in the answer",
    )


# =============================================================================
# Generic Response Wrapper
# =============================================================================

class ApiResponse(BaseModel, Generic[T]):
    """
    Generic API response wrapper for consistent response format.
    
    Example:
        >>> response = ApiResponse(success=True, data={"key": "value"})
    """
    
    success: bool = Field(
        ...,
        description="Whether the request was successful",
    )
    data: T | None = Field(
        default=None,
        description="Response data (when successful)",
    )
    error: ErrorResponse | None = Field(
        default=None,
        description="Error details (when unsuccessful)",
    )
    meta: dict[str, Any] | None = Field(
        default=None,
        description="Additional metadata",
    )
