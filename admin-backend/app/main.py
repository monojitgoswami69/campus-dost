import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from .config import settings, logger
from .providers.database.firestore_init import initialize_firebase
from .utils.limiter import limiter
from .exceptions import AppException
from .routers import auth, upload, knowledge_base, archive, text, system_instructions, dashboard, health, batch

app = FastAPI(title="Admin Backend", version="3.1.0", docs_url=None, redoc_url=None)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Firebase...")
    initialize_firebase()
    logger.info("Firebase initialized successfully")

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"status": "error", "message": "Rate limit exceeded. Please try again later."})

# CORS configuration - Allow all origins for development and testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Cannot use credentials with wildcard origins
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["X-New-Token"],
)

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(status_code=exc.status_code, content={"status": "error", "message": exc.message, "details": str(exc.details) if exc.details else None})

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"status": "error", "message": "Internal server error"})

# Include Routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(knowledge_base.router)
app.include_router(archive.router)
app.include_router(text.router)
app.include_router(batch.router)
app.include_router(system_instructions.router)
app.include_router(dashboard.router)
app.include_router(health.router)
