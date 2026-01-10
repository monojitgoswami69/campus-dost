from fastapi import HTTPException
from typing import Optional
from ..config import settings

def validate_no_null_bytes(value: str, field_name: str) -> None:
    if '\x00' in value:
        raise HTTPException(status_code=400, detail=f"{field_name} contains invalid characters")

def validate_filename(filename: str) -> None:
    if not filename or len(filename) > 255:
        raise HTTPException(status_code=400, detail="Invalid filename length")
    if '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename format")

def validate_text_length(text: str, max_length: Optional[int] = None) -> None:
    limit = max_length or settings.TEXT_MAX_LENGTH
    if not text or len(text) > limit:
        raise HTTPException(status_code=400, detail=f"Text must be between 1 and {limit} characters")
