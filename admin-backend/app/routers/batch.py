"""
Batch operations router for admin backend
Handles bulk operations like batch download
"""
import io
import time
import zipfile
import asyncio
from datetime import datetime
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from ..config import settings, logger
from ..dependencies import require_admin
from ..utils.limiter import limiter
from ..providers.database.metadata import metadata_provider
from ..providers.storage import storage_provider
from ..exceptions import NotFoundError

router = APIRouter(prefix="/api/v1", tags=["batch"])


class BatchDownloadRequest(BaseModel):
    """Request model for batch download"""
    document_ids: List[str]
    source: str = "knowledge-base"  # "knowledge-base" or "archive"


@router.post("/batch-download")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def batch_download(
    request: Request,
    req: BatchDownloadRequest,
    user: dict = Depends(require_admin)
):
    """
    Download multiple documents as a ZIP archive
    
    - **document_ids**: List of document IDs to download
    - **source**: Source location - "knowledge-base" (active) or "archive"
    
    Downloads files concurrently and creates a ZIP archive in memory.
    Failed downloads are logged but don't prevent ZIP creation.
    """
    start_time = time.perf_counter()
    
    if not req.document_ids:
        raise HTTPException(400, "No document IDs provided")
    
    if len(req.document_ids) > 100:
        raise HTTPException(400, "Maximum 100 documents per batch download")
    
    # Determine if downloading from archive
    is_archived = req.source == "archive"
    
    logger.info(f"Batch download requested: {len(req.document_ids)} documents from {req.source}")
    
    # Fetch all document metadata concurrently
    fetch_start = time.perf_counter()
    doc_tasks = [
        metadata_provider.get_document(doc_id, archived=is_archived)
        for doc_id in req.document_ids
    ]
    docs = await asyncio.gather(*doc_tasks, return_exceptions=True)
    fetch_elapsed = (time.perf_counter() - fetch_start) * 1000
    
    # Filter out failed fetches and exceptions
    valid_docs = []
    for i, doc in enumerate(docs):
        if isinstance(doc, Exception):
            logger.warning(f"Failed to fetch document {req.document_ids[i]}: {doc}")
        elif doc is None:
            logger.warning(f"Document not found: {req.document_ids[i]}")
        else:
            valid_docs.append((req.document_ids[i], doc))
    
    if not valid_docs:
        raise NotFoundError("No valid documents found")
    
    logger.info(f"Fetched metadata for {len(valid_docs)}/{len(req.document_ids)} documents | {fetch_elapsed:.1f}ms")
    
    # Download all files concurrently
    download_start = time.perf_counter()
    download_tasks = [
        storage_provider.download_file(doc_id, doc["filename"], is_archived)
        for doc_id, doc in valid_docs
    ]
    file_contents = await asyncio.gather(*download_tasks, return_exceptions=True)
    download_elapsed = (time.perf_counter() - download_start) * 1000
    
    # Create ZIP file in memory
    zip_start = time.perf_counter()
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        successful_files = 0
        failed_files = 0
        
        for i, (doc_id, doc) in enumerate(valid_docs):
            content = file_contents[i]
            filename = doc["filename"]
            
            if isinstance(content, Exception):
                logger.error(f"Failed to download {filename}: {content}")
                failed_files += 1
                # Add error file to ZIP
                error_msg = f"Failed to download: {str(content)}"
                zip_file.writestr(f"ERRORS/{filename}.error.txt", error_msg)
            elif content is None:
                logger.warning(f"No content for {filename}, using fallback")
                # Try to use raw_text as fallback
                fallback_content = doc.get("raw_text", "").encode("utf-8")
                if fallback_content:
                    zip_file.writestr(filename, fallback_content)
                    successful_files += 1
                else:
                    failed_files += 1
                    zip_file.writestr(f"ERRORS/{filename}.error.txt", "No content available")
            else:
                # Successfully downloaded file
                zip_file.writestr(filename, content)
                successful_files += 1
    
    zip_elapsed = (time.perf_counter() - zip_start) * 1000
    total_elapsed = (time.perf_counter() - start_time) * 1000
    
    # Prepare ZIP for download
    zip_buffer.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d")
    source_name = "archived" if is_archived else "documents"
    zip_filename = f"{source_name}_{timestamp}.zip"
    
    logger.info(
        f"Batch download complete: {successful_files} files, {failed_files} errors | "
        f"Fetch: {fetch_elapsed:.1f}ms | Download: {download_elapsed:.1f}ms | "
        f"ZIP: {zip_elapsed:.1f}ms | Total: {total_elapsed:.1f}ms"
    )
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
            "X-Files-Successful": str(successful_files),
            "X-Files-Failed": str(failed_files)
        }
    )
