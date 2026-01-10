import time
from fastapi import APIRouter, Request, Depends, BackgroundTasks
from ..config import settings, logger
from ..dependencies import require_admin
from ..utils.limiter import limiter
from ..providers.database.metrics import metrics_provider
from ..providers.database.activity import activity_provider

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/stats")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_stats(request: Request, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    metrics = await metrics_provider.get_metrics()
    
    # Format timestamps
    if metrics.get('last_updated'):
        metrics['last_updated'] = metrics['last_updated'].isoformat() if hasattr(metrics['last_updated'], 'isoformat') else str(metrics['last_updated'])
        
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Dashboard stats retrieved | {elapsed:.1f}ms")
    
    # Trigger background update if stats are stale (optional optimization)
    # background_tasks.add_task(firestore_service.update_metrics)
    
    return {"status": "success", "stats": metrics}

@router.get("/activity")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_activity(request: Request, limit: int = settings.LOG_DEFAULT_LIMIT, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    limit = min(max(1, limit), settings.LOG_MAX_LIMIT)
    logs = await activity_provider.get_activity_log(limit)
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Activity log retrieved: {len(logs)} items | {elapsed:.1f}ms")
    return {"status": "success", "activity": logs}

@router.get("/weekly")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_weekly_activity(request: Request, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    data = await metrics_provider.get_weekly_metrics()
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Weekly activity retrieved | {elapsed:.1f}ms")
    # Return with 'weekly' key to match frontend expectations
    return {"status": "success", "weekly": data}
