"""
FastAPI application entry point.

This module initializes the FastAPI application with:
- Lifespan management (startup/shutdown)
- Middleware configuration (CORS, rate limiting)
- Exception handlers
- Route registration
- OpenAPI documentation

Architecture:
- Provider pattern for hot-swappable components (LLM, Embedding, Database)
- Centralized configuration via Pydantic Settings
- Clean separation of concerns (routes, services, providers)

Usage:
    Run with uvicorn:
        uvicorn app.main:app --host 0.0.0.0 --port 8080
    
    Or with the server.py entry point:
        python server.py
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_logger, settings
from app.dependencies import get_client_ip
from app.exceptions import ChatbotException
from app.models import ErrorResponse
from app.routes import chat as chat_routes
from app.routes import health
from app.routes import session
from app.routes import handoff as handoff_routes
from app.state import AppState

logger = get_logger("app.main")


# =============================================================================
# Application Lifespan
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles:
    - Startup: Initialize providers and application state
    - Shutdown: Clean up resources and connections
    """
    logger.info("=" * 60)
    logger.info("SC-CSE Chatbot Server Starting...")
    logger.info("=" * 60)
    logger.info(
        "Configuration | LLM=%s | Embedding=%s | Database=%s",
        settings.LLM_PROVIDER,
        settings.EMBEDDING_PROVIDER,
        settings.DATABASE_PROVIDER,
    )

    try:
        # Initialize application state (providers)
        app_state = await AppState.create()
        app.state.app_state = app_state
        
        logger.info("Application state initialized successfully")
        logger.info(
            "Provider Status | LLM=%s | Embedding=%s | Database=%s",
            "OK" if app_state.llm_provider.is_available() else "UNAVAILABLE",
            "OK" if app_state.embedding_provider.is_available() else "UNAVAILABLE",
            "OK" if app_state.database_provider.is_available() else "UNAVAILABLE",
        )
        logger.info("Server ready to accept requests")
        logger.info("=" * 60)
        
    except Exception as exc:
        logger.critical("Startup failed: %s", exc, exc_info=True)
        raise

    yield  # Application running

    # Shutdown
    logger.info("Shutting down...")
    if hasattr(app.state, "app_state"):
        try:
            await app.state.app_state.database_provider.close()
            logger.info("Database connection closed")
        except Exception as e:
            logger.error("Error during shutdown: %s", e)
    logger.info("Shutdown complete")


# =============================================================================
# FastAPI Application
# =============================================================================

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        Configured FastAPI application instance
    """
    application = FastAPI(
        title="SC-CSE Chatbot API",
        description=(
            "Async chatbot API with RAG (Retrieval Augmented Generation) "
            "and hot-swappable LLM providers."
        ),
        version="3.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    
    # Configure application
    configure_rate_limiting(application)
    configure_cors(application)
    configure_exception_handlers(application)
    configure_routes(application)
    
    return application


# =============================================================================
# Rate Limiting
# =============================================================================

def get_real_ip(request: Request) -> str:
    """
    Get the real client IP for rate limiting.
    
    Handles X-Forwarded-For and X-Real-IP headers from proxies.
    """
    return get_client_ip(request)


def configure_rate_limiting(application: FastAPI) -> None:
    """Configure rate limiting middleware."""
    limiter = Limiter(key_func=get_real_ip)
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    logger.debug("Rate limiting configured: %s", settings.RATE_LIMIT)


# =============================================================================
# CORS Configuration
# =============================================================================

def configure_cors(application: FastAPI) -> None:
    """Configure CORS middleware."""
    cors_origins = settings.CORS_ORIGINS_LIST
    allow_credentials = cors_origins != ["*"]

    if not allow_credentials:
        logger.warning(
            "[WARNING] CORS: Wildcard origin '*' configured. "
            "This disables credentials and is NOT recommended for production."
        )
    else:
        logger.info("CORS: Configured for origins: %s", cors_origins)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=allow_credentials,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Handoff-Required", "X-Handoff-Id", "X-Confidence"],
    )


# =============================================================================
# Exception Handlers
# =============================================================================

def configure_exception_handlers(application: FastAPI) -> None:
    """Configure exception handlers."""
    
    @application.exception_handler(ChatbotException)
    async def chatbot_exception_handler(
        request: Request,
        exc: ChatbotException,
    ) -> JSONResponse:
        """Handle custom chatbot exceptions."""
        logger.warning(
            "ChatbotException | path=%s | type=%s | message=%s",
            request.url.path,
            exc.__class__.__name__,
            exc.message,
        )
        
        error_response = ErrorResponse(
            detail=exc.message,
            error_type=exc.__class__.__name__,
            timestamp=datetime.now(timezone.utc),
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.message,
                "error_type": exc.__class__.__name__,
            },
        )

    @application.exception_handler(Exception)
    async def global_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """Handle unhandled exceptions."""
        logger.error(
            "Unhandled exception | path=%s | type=%s | error=%s",
            request.url.path,
            type(exc).__name__,
            exc,
            exc_info=True,
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "error_type": "InternalError",
            },
        )


# =============================================================================
# Route Configuration
# =============================================================================

def configure_routes(application: FastAPI) -> None:
    """Configure application routes."""
    # Health check routes
    application.include_router(health.router)
    
    # Session management routes
    application.include_router(session.router)
    
    # Handoff routes (email submission)
    application.include_router(handoff_routes.router)
    
    # Chat endpoint with rate limiting
    limiter = application.state.limiter
    rate_limit = settings.RATE_LIMIT

    @limiter.limit(rate_limit)
    @application.post(
        "/chat",
        tags=["Chat"],
        summary="Chat with the AI assistant (Streaming)",
        description=(
            "Send a message and receive a streaming response. "
            "Supports conversation history, RAG context retrieval, and intelligent handoff. "
            "The LLM decides if it can answer or needs human handoff. "
            "Check X-Handoff-Required header for handoff status."
        ),
        responses={
            200: {
                "description": "Streaming text response",
                "content": {"text/plain": {"example": "Hello! How can I help you today?"}},
                "headers": {
                    "X-Handoff-Required": {"description": "Whether human handoff is needed", "schema": {"type": "string"}},
                    "X-Handoff-Id": {"description": "Handoff request ID if created", "schema": {"type": "string"}},
                    "X-Confidence": {"description": "LLM confidence score (0-100)", "schema": {"type": "string"}},
                },
            },
            400: {"description": "Invalid request"},
            429: {"description": "Rate limit exceeded"},
            503: {"description": "Service unavailable"},
        },
    )
    async def chat_endpoint(
        request: Request,
        chat_request: chat_routes.ChatRequest,
        state: AppState = chat_routes.Depends(chat_routes.get_app_state),
    ):
        """
        Chat endpoint with rate limiting and hybrid handoff support.
        
        This endpoint streams the AI response as plain text chunks.
        The LLM decides if it can answer from context or needs human handoff.
        """
        return await chat_routes.chat_endpoint(request, chat_request, state)

    @limiter.limit(rate_limit)
    @application.post(
        "/chat/json",
        tags=["Chat"],
        summary="Chat with the AI assistant (JSON Response)",
        description=(
            "Send a message and receive a JSON response with handoff information. "
            "Non-streaming alternative for clients that need handoff info in response body."
        ),
        response_model=chat_routes.ChatResponse,
        responses={
            200: {"description": "JSON response with message and handoff info"},
            400: {"description": "Invalid request"},
            429: {"description": "Rate limit exceeded"},
            503: {"description": "Service unavailable"},
        },
    )
    async def chat_json_endpoint(
        request: Request,
        chat_request: chat_routes.ChatRequest,
        state: AppState = chat_routes.Depends(chat_routes.get_app_state),
    ):
        """
        Non-streaming chat endpoint with full handoff info in response body.
        """
        return await chat_routes.chat_json_endpoint(request, chat_request, state)


# =============================================================================
# Application Instance
# =============================================================================

app = create_app()


# =============================================================================
# Custom OpenAPI Schema
# =============================================================================

def custom_openapi() -> dict[str, Any]:
    """Generate custom OpenAPI schema with additional metadata."""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add server information
    openapi_schema["servers"] = [
        {"url": "/", "description": "Current server"},
    ]
    
    # Add contact information
    openapi_schema["info"]["contact"] = {
        "name": "SC-CSE Chatbot API",
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

