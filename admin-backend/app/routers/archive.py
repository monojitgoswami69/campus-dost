import time
import asyncio
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from ..config import settings, logger
from ..dependencies import require_admin
from ..utils.limiter import limiter
from ..providers.database.metadata import metadata_provider
from ..providers.database.vectors import vector_storage_provider
from ..providers.database.activity import activity_provider
from ..providers.database.metrics import metrics_provider
from ..providers.storage import storage_provider
from ..services.ingestion import pipeline

router = APIRouter(prefix="/api/v1/archive", tags=["archive"])

@router.get("")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def list_archive(request: Request, limit: int = 500, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    limit = min(max(1, limit), settings.API_MAX_LIMIT)
    docs = await metadata_provider.list_documents(limit, archived=True)
    for d in docs:
        if d.get('archived_at'): d['archived_at'] = d['archived_at'].isoformat() if hasattr(d['archived_at'], 'isoformat') else str(d['archived_at'])
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Listed {len(docs)} archived documents | {elapsed:.1f}ms")
    return {"status": "success", "files": docs, "total": len(docs)}

@router.post("/restore")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def restore_doc(request: Request, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    start_time = time.perf_counter()
    req = await request.json()
    archive_id = req.get("archive_id")
    if not archive_id or len(archive_id) > 100: raise HTTPException(400, "Invalid archive ID")
    res = await pipeline.restore_document(archive_id, user["uid"], background_tasks)
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Restore endpoint complete: {archive_id} | {elapsed:.1f}ms")
    return {"status": "success", "message": "Document restored", "document_id": res["document_id"]}

@router.delete("/cleanup")
@limiter.limit(settings.RATE_LIMIT_CLEANUP)
async def cleanup_archives(request: Request, days: int = None, background_tasks: BackgroundTasks = None, user: dict = Depends(require_admin)):
    """Clean up old archived documents and their vectors based on retention period."""
    start_time = time.perf_counter()
    
    retention_days = days or settings.ARCHIVE_RETENTION_DAYS
    
    # Optimized: Single query gets docs and deletes them, returns what was deleted
    cleanup_result = await metadata_provider.cleanup_old_archives(retention_days)
    deleted_docs = cleanup_result['deleted_count']
    deleted_doc_info = cleanup_result['documents']
    
    # Delete vectors and storage files for each deleted document
    vector_deletion_tasks = []
    storage_deletion_tasks = []
    
    for doc_info in deleted_doc_info:
        doc_id = doc_info['id']
        filename = doc_info['filename']
        
        # Delete archived vectors
        vector_deletion_tasks.append(
            vector_storage_provider.delete_vectors(doc_id, archived=True)
        )
        
        # Delete file from storage
        storage_deletion_tasks.append(
            storage_provider.delete_file(doc_id, filename, archived=True, message="Auto-cleanup")
        )
    
    # Execute all deletions in parallel
    if vector_deletion_tasks:
        await asyncio.gather(*vector_deletion_tasks, return_exceptions=True)
    if storage_deletion_tasks:
        await asyncio.gather(*storage_deletion_tasks, return_exceptions=True)
    
    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(f"Cleanup archives: {deleted_docs} docs deleted | {elapsed:.1f}ms")
    
    if background_tasks:
        background_tasks.add_task(metrics_provider.update_metrics)
    
    return {
        "status": "success", 
        "message": f"Cleaned up {deleted_docs} old archives", 
        "deleted_count": deleted_docs,
        "retention_days": retention_days,
        "details": deleted_doc_info
    }
