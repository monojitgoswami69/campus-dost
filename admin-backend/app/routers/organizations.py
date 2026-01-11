"""
Organizations router for listing available organizations.

PUBLIC ENDPOINT: No authentication required.
Used by chatbot frontend to populate organization selection dropdown.
"""
import time
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List
from ..config import settings, logger
from ..utils.limiter import limiter
from ..providers.database.firestore_init import get_db

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


class OrganizationResponse(BaseModel):
    """Organization response model."""
    org_id: str
    name: str


@router.get("")
@limiter.limit("30/minute")  # Rate limit: 30 requests per minute
async def list_organizations(request: Request):
    """
    List all available organizations.
    
    PUBLIC ENDPOINT: No authentication required.
    Fetches from Firestore organizations collection to get all registered organizations.
    
    Returns:
        List of organizations with org_id and display name
    """
    start_time = time.perf_counter()
    
    try:
        db = get_db()
        
        # Fetch all organizations from Firestore organizations collection
        orgs_ref = db.collection(settings.ORGANIZATIONS_COLLECTION)
        orgs_snapshot = await orgs_ref.get()
        
        organizations = []
        for doc in orgs_snapshot:
            org_data = doc.to_dict()
            # Only include active organizations
            if org_data.get("status", "active") == "active":
                organizations.append({
                    "org_id": doc.id,
                    "name": org_data.get("name", doc.id.upper())
                })
        
        # Sort by org_id
        organizations.sort(key=lambda x: x["org_id"])
        
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.info(f"Listed {len(organizations)} organizations from Firestore in {elapsed_ms:.1f}ms")
        
        return {
            "organizations": organizations,
            "count": len(organizations)
        }
        
    except Exception as e:
        logger.error(f"Error listing organizations from Firestore: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch organizations: {str(e)}"
        )
