from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/")
async def root():
    return {"status": "online", "service": "Admin Backend", "version": "3.1.0"}

@router.get("/health")
async def health_check():
    return {"status": "healthy"}
