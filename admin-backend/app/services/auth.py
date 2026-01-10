import secrets
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional
import jwt
from fastapi.security import HTTPBearer
from ..config import settings

security = HTTPBearer(auto_error=False)

def verify_credentials(username: str, password: str) -> Tuple[bool, str]:
    username_match = secrets.compare_digest(username, settings.ADMIN_USERNAME)
    password_match = settings.verify_password(password)
    if not username_match or not password_match:
        return False, "invalid_credentials"
    return True, ""

def create_jwt_token(username: str, role: str = "admin") -> str:
    if not username or not isinstance(username, str):
        raise ValueError("Invalid username")
    if len(username) > 100:
        raise ValueError("Username too long")
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    payload = {
        "sub": username,
        "role": role,
        "iat": now,
        "exp": exp,
        "jti": secrets.token_hex(16)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Tuple[Optional[dict], bool, int]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        exp = payload.get("exp", 0)
        now_ts = datetime.now(timezone.utc).timestamp()
        remaining = max(0, int(exp - now_ts))
        needs_refresh = remaining < (settings.JWT_REFRESH_THRESHOLD_MINUTES * 60)
        return payload, needs_refresh, remaining
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None, False, 0
