import time
from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from ..config import settings, logger
from ..dependencies import require_admin
from ..utils.limiter import limiter
from ..providers.configuration import config_provider
from ..providers.database.metrics import metrics_provider
from ..providers.database.activity import activity_provider

router = APIRouter(prefix="/api/v1/system-instructions", tags=["system-instructions"])

@router.get("")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_sys_ins(request: Request, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    res = await config_provider.get_instructions()
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"System instructions retrieved | {elapsed:.1f}ms")
    return {"status": "success", "content": res["content"], "commit": res.get("commit")}

@router.post("/save")
@limiter.limit(settings.RATE_LIMIT_SYS_INS)
async def save_sys_ins(request: Request, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    req = await request.json()
    content = req.get("content", "")
    message = req.get("message")
    if not content or len(content) > settings.SYS_INS_MAX_CONTENT: raise HTTPException(400, "Invalid content length")
    if message and len(message) > settings.SYS_INS_MAX_MESSAGE: raise HTTPException(400, "Message too long")
    curr = await config_provider.get_instructions()
    if curr.get("content"): await metrics_provider.backup_system_instructions(curr["content"], user["username"])
    res = await config_provider.save_instructions(content, message or f"Update by {user['username']}")
    background_tasks.add_task(activity_provider.log_activity, "sys_instructions_updated", user["uid"], "sys_ins", "main", {})
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"System instructions saved | {elapsed:.1f}ms")
    return {"status": "success", "message": "System instructions saved", "commit": res.get("commit")}

@router.get("/history")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_sys_history(request: Request, limit: int = 3, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    limit = min(max(1, limit), 50)
    hist = await metrics_provider.get_system_instructions_history(limit)
    for h in hist:
        if h.get('backed_up_at'):
            h['backed_up_at'] = h['backed_up_at'].isoformat() if hasattr(h['backed_up_at'], 'isoformat') else str(h['backed_up_at'])
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"System instructions history retrieved: {len(hist)} items | {elapsed:.1f}ms")
    return {"status": "success", "history": hist, "total": len(hist)}
