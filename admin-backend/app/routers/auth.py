import time
from fastapi import APIRouter, Request, Depends, HTTPException
from ..config import settings, logger
from ..utils.validators import validate_no_null_bytes
from ..services.auth import verify_credentials, create_jwt_token
from ..dependencies import get_current_user
from ..utils.limiter import limiter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/login")
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request):
    start_time = time.perf_counter()
    req = await request.json()
    username = req.get("username", "")
    password = req.get("password", "")
    validate_no_null_bytes(username, "username")
    validate_no_null_bytes(password, "password")
    if not username or len(username) > 100 or not password or len(password) > 200:
        raise HTTPException(status_code=400, detail="Invalid input")
    valid, err = verify_credentials(username, password)
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt_token(username)
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Login successful: {username} | {elapsed:.1f}ms")
    return {"status": "success", "message": "Login successful", "user": {"username": username, "role": "admin", "token": token}}

@router.post("/refresh")
async def refresh_token(user: dict = Depends(get_current_user)):
    start_time = time.perf_counter()
    new_token = create_jwt_token(user["username"], user["role"])
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Token refresh: {user['username']} | {elapsed:.1f}ms")
    return {"status": "success", "token": new_token}

@router.post("/logout")
async def logout():
    return {"status": "success", "message": "Logged out successfully"}
