from typing import Optional
from fastapi import Header, Response, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from .services.auth import security, decode_jwt_token, create_jwt_token

async def get_current_user(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        authorization: Optional[str] = Header(None),
        response: Response = None
) -> dict:
    token = credentials.credentials if credentials else (authorization[7:] if authorization and authorization.startswith("Bearer ") else None)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    payload, refresh, _ = decode_jwt_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    user = {"uid": payload.get("sub"), "username": payload.get("sub"), "role": payload.get("role", "admin")}
    if refresh and response:
        new_token = create_jwt_token(user["username"], user["role"])
        response.headers["X-New-Token"] = new_token
        response.headers["Access-Control-Expose-Headers"] = "X-New-Token"
    return user

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user
