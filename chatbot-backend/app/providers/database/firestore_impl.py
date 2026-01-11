"""
Firestore Database Provider implementation.

Uses Google Cloud Firestore for vector similarity search.
Includes retry logic for transient failures.
Includes LRU cache for system instructions to reduce DB hits.
"""
from __future__ import annotations

import asyncio
import base64
import json
import time
from collections import OrderedDict
from typing import List, Optional, Dict, Any

from google.cloud import firestore
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
from google.cloud.firestore_v1.vector import Vector
from google.oauth2 import service_account

from ...config import settings, get_logger
from ...exceptions import DatabaseError
from ...utils import is_retryable_error
from .interface import DatabaseProviderInterface, VectorSearchResult

logger = get_logger("database.firestore")


# =============================================================================
# LRU Cache for System Instructions
# =============================================================================

class SystemInstructionsCache:
    """
    LRU Cache for system instructions mapped by org_id.
    
    Features:
    - Per-org cache entries prevent cross-org data conflicts
    - TTL-based expiration for freshness (5 minutes)
    - Max entries limit to bound memory usage (100 orgs)
    - Thread-safe for async operations
    """
    
    def __init__(self, max_entries: int = 100, ttl_seconds: int = 300):
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._max_entries = max_entries
        self._ttl_seconds = ttl_seconds
    
    def get(self, org_id: str) -> Optional[str]:
        """Get cached instructions for org_id if not expired."""
        if org_id not in self._cache:
            return None
        
        entry = self._cache[org_id]
        
        # Check TTL
        if time.time() - entry['cached_at'] > self._ttl_seconds:
            # Expired, remove from cache
            del self._cache[org_id]
            logger.debug(f"System instruction cache expired for org={org_id}")
            return None
        
        # Move to end (most recently used)
        self._cache.move_to_end(org_id)
        logger.debug(f"System instruction cache hit for org={org_id}")
        return entry['content']
    
    def set(self, org_id: str, content: str) -> None:
        """Cache instructions for org_id."""
        # Remove oldest if at capacity
        while len(self._cache) >= self._max_entries:
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
            logger.debug(f"System instruction cache evicted oldest entry for org={oldest_key}")
        
        self._cache[org_id] = {
            'content': content,
            'cached_at': time.time()
        }
        # Move to end (most recently used)
        self._cache.move_to_end(org_id)
        logger.debug(f"System instruction cache set for org={org_id}")
    
    def invalidate(self, org_id: str) -> None:
        """Invalidate cache for specific org_id."""
        if org_id in self._cache:
            del self._cache[org_id]
            logger.info(f"System instruction cache invalidated for org={org_id}")
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            'entries': len(self._cache),
            'max_entries': self._max_entries,
            'ttl_seconds': self._ttl_seconds,
            'orgs_cached': list(self._cache.keys())
        }


class FirestoreDatabaseProvider(DatabaseProviderInterface):
    """
    Firestore database provider for vector similarity search.
    
    Supports async operations, configurable collection/field names,
    and retry logic for transient failures.
    Includes LRU cache for system instructions.
    """
    
    # Class-level cache shared across all instances (singleton pattern)
    _instructions_cache = SystemInstructionsCache(
        max_entries=100,  # Support up to 100 orgs in memory
        ttl_seconds=300   # 5 minutes TTL
    )
    
    def __init__(self):
        self._client: Optional[firestore.AsyncClient] = None
        self._initialized = False
        self._credentials = None
    
    async def initialize(self) -> bool:
        """Initialize Firestore connection with retry logic."""
        if self._initialized and self._client:
            return True
        
        last_error: Exception | None = None
        
        for attempt in range(settings.MAX_RETRIES + 1):
            try:
                if settings.FIREBASE_CREDS_BASE64:
                    # Decode base64 credentials
                    padded = settings.FIREBASE_CREDS_BASE64 + "=" * (
                        (4 - len(settings.FIREBASE_CREDS_BASE64) % 4) % 4
                    )
                    cred_json = base64.b64decode(padded).decode("utf-8")
                    info = json.loads(cred_json)
                    self._credentials = service_account.Credentials.from_service_account_info(info)
                    self._client = firestore.AsyncClient(credentials=self._credentials)
                else:
                    # Use default credentials (ADC)
                    self._client = firestore.AsyncClient()
                
                self._initialized = True
                logger.info("Firestore AsyncClient initialized successfully")
                return True
                
            except Exception as e:
                last_error = e
                if is_retryable_error(e) and attempt < settings.MAX_RETRIES:
                    delay = min(
                        settings.RETRY_BASE_DELAY * (2 ** attempt),
                        settings.RETRY_MAX_DELAY,
                    )
                    logger.warning(
                        "Firestore initialization failed (attempt %d/%d): %s, retrying in %.2fs",
                        attempt + 1,
                        settings.MAX_RETRIES + 1,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error("Firestore initialization failed: %s", e)
                    return False
        
        logger.error("Firestore initialization failed after all retries: %s", last_error)
        return False
    
    async def search_similar(
        self,
        embedding: List[float],
        top_k: int = 5,
        similarity_threshold: float = 0.0,
        org_id: str | None = None,
    ) -> List[VectorSearchResult]:
        """Search for similar documents using Firestore vector search with retry logic.
        
        Args:
            embedding: Query embedding vector
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score (0.0 to 1.0)
            org_id: Organization ID for multi-tenant filtering (optional, defaults to 'default')
        """
        if not self._client:
            logger.warning("Firestore client not initialized")
            return []
        
        # Default to 'default' org_id if not provided
        org_id = org_id or "default"
        
        last_error: Exception | None = None
        
        for attempt in range(settings.MAX_RETRIES + 1):
            try:
                vector = Vector(embedding)
                coll_ref = self._client.collection(settings.FIRESTORE_VECTOR_COLLECTION)
                
                # Build query with org_id filter
                query = coll_ref.where("org_id", "==", org_id).find_nearest(
                    vector_field=settings.FIRESTORE_VECTOR_FIELD,
                    query_vector=vector,
                    distance_measure=DistanceMeasure.COSINE,
                    limit=top_k,
                    distance_result_field="distance",
                )
                
                query_task = query.get()
                
                results = await asyncio.wait_for(
                    query_task,
                    timeout=settings.FIRESTORE_QUERY_TIMEOUT_SECONDS
                )
                
                search_results: List[VectorSearchResult] = []
                for doc in results:
                    doc_dict = doc.to_dict()
                    text = doc_dict.get("text", "")
                    distance = doc_dict.get("distance", 1.0)
                    
                    # Convert cosine distance to similarity: similarity = 1 - distance
                    similarity = max(0.0, 1.0 - distance)
                    
                    if text and similarity >= similarity_threshold:
                        # Extract metadata (excluding internal fields)
                        metadata = {
                            k: v for k, v in doc_dict.items()
                            if k not in ("text", "embedding", "distance", settings.FIRESTORE_VECTOR_FIELD)
                        }
                        
                        search_results.append(VectorSearchResult(
                            text=text,
                            score=similarity,
                            metadata=metadata if metadata else None,
                        ))
                
                # Sort by score (descending)
                search_results.sort(key=lambda x: x.score, reverse=True)
                logger.info(f"Vector search completed for org_id={org_id}, found {len(search_results)} results")
                return search_results
                
            except asyncio.TimeoutError as e:
                last_error = e
                logger.warning(
                    "Vector store query timed out (attempt %d/%d)",
                    attempt + 1,
                    settings.MAX_RETRIES + 1,
                )
                if attempt >= settings.MAX_RETRIES:
                    return []
                    
            except Exception as e:
                last_error = e
                if is_retryable_error(e) and attempt < settings.MAX_RETRIES:
                    delay = min(
                        settings.RETRY_BASE_DELAY * (2 ** attempt),
                        settings.RETRY_MAX_DELAY,
                    )
                    logger.warning(
                        "Vector store query failed (attempt %d/%d): %s, retrying in %.2fs",
                        attempt + 1,
                        settings.MAX_RETRIES + 1,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error("Vector store query failed: %s", e)
                    return []
        
        return []
    
    async def health_check(self) -> bool:
        """Perform a health check by querying the collection."""
        if not self._client:
            return False
        
        try:
            coll_ref = self._client.collection(settings.FIRESTORE_VECTOR_COLLECTION)
            # Just check if we can access the collection (limit 1 for speed)
            await asyncio.wait_for(
                coll_ref.limit(1).get(),
                timeout=5.0,
            )
            return True
        except Exception as e:
            logger.warning("Firestore health check failed: %s", e)
            return False
    
    def get_provider_name(self) -> str:
        """Get the provider name."""
        return "firestore"
    
    def is_available(self) -> bool:
        """Check if Firestore is available."""
        return self._initialized and self._client is not None
    
    async def close(self) -> None:
        """Close the Firestore connection properly."""
        if self._client:
            try:
                # Close the underlying gRPC channel
                self._client._client._transport.grpc_channel.close()
                logger.info("Firestore gRPC channel closed")
            except Exception as e:
                logger.warning("Error closing Firestore gRPC channel: %s", e)
            finally:
                self._client = None
                self._initialized = False
                self._credentials = None
                logger.info("Firestore connection closed")
    
    async def get_system_instructions(self, org_id: str) -> str | None:
        """
        Get system instructions for an organization from Firestore.
        
        Uses LRU cache for fast warm starts and reduced DB hits.
        Falls back to Firestore on cache miss.
        
        Fetches from 'system_instructions' collection where document ID = org_id.
        
        Args:
            org_id: Organization identifier
            
        Returns:
            System instruction content string or None if not found
        """
        if not self._client:
            logger.warning("Firestore client not initialized for system instructions fetch")
            return None
        
        # Check cache first
        cached_content = self._instructions_cache.get(org_id)
        if cached_content is not None:
            logger.info(f"System instructions cache hit for org={org_id}")
            return cached_content
        
        # Cache miss - fetch from Firestore
        try:
            doc_ref = self._client.collection("system_instructions").document(org_id)
            doc = await asyncio.wait_for(doc_ref.get(), timeout=5.0)
            
            if doc.exists:
                data = doc.to_dict()
                content = data.get("content", "")
                
                # Cache the result
                if content:
                    self._instructions_cache.set(org_id, content)
                
                logger.info(
                    "System instructions fetched from Firestore for org=%s | length=%d | cached=true",
                    org_id,
                    len(content) if content else 0
                )
                return content
            else:
                logger.warning("No system instructions found for org=%s", org_id)
                return None
                
        except asyncio.TimeoutError:
            logger.error("Timeout fetching system instructions for org=%s", org_id)
            return None
        except Exception as e:
            logger.error("Failed to fetch system instructions for org=%s: %s", org_id, e)
            return None
