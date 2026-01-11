"""
RAG (Retrieval Augmented Generation) service.

This module provides context retrieval functionality using vector similarity
search. It uses the provider pattern for embedding generation and database
queries.

Key features:
- Intelligent query filtering (skips greetings, short queries)
- Provider-agnostic implementation
- Comprehensive logging
- Type-safe data classes

Usage:
    from app.services.rag import RAGService, get_rag_context
    
    results = await get_rag_context(query, app_state)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol, Sequence, runtime_checkable

from app.config import get_logger, settings

if TYPE_CHECKING:
    from app.providers.database.interface import VectorSearchResult
    from app.state import AppState

logger = get_logger("services.rag")


# =============================================================================
# Data Classes
# =============================================================================

@dataclass(frozen=True, slots=True)
class RAGResult:
    """
    Vector search result with cosine similarity score.
    
    Attributes:
        text: Retrieved document text
        score: Similarity score (0.0 to 1.0, higher is better)
        metadata: Optional document metadata
    """
    text: str
    score: float
    metadata: dict | None = None
    
    def __repr__(self) -> str:
        text_preview = self.text[:50] + "..." if len(self.text) > 50 else self.text
        return f"RAGResult(score={self.score:.3f}, text='{text_preview}')"


@dataclass(frozen=True)
class RAGConfig:
    """Configuration for RAG retrieval."""
    top_k: int = field(default_factory=lambda: settings.RAG_TOP_K)
    similarity_threshold: float = field(default_factory=lambda: settings.RAG_SIMILARITY_THRESHOLD)
    min_query_words: int = 3
    skip_patterns: frozenset[str] = field(default_factory=lambda: frozenset({
        "hello", "hi", "hey",
        "thanks", "thank you", "ok", "okay",
        "bye", "goodbye", "good night",
        "who are you", "what is your name",
        "good morning", "good afternoon", "good evening",
        "how are you", "what's up",
    }))


# =============================================================================
# RAG Service Class
# =============================================================================

class RAGService:
    """
    Service for retrieving context using RAG (Retrieval Augmented Generation).
    
    This class encapsulates all RAG-related logic including:
    - Query filtering (skip greetings, short queries)
    - Embedding generation
    - Vector similarity search
    - Result transformation
    
    Example:
        >>> service = RAGService(state)
        >>> results = await service.get_context("What is machine learning?")
    """
    
    def __init__(
        self,
        state: "AppState",
        config: RAGConfig | None = None,
    ) -> None:
        """
        Initialize RAG service.
        
        Args:
            state: Application state with providers
            config: Optional custom configuration
        """
        self._state = state
        self._config = config or RAGConfig()
    
    def should_skip_query(self, query: str) -> tuple[bool, str]:
        """
        Determine if RAG should be skipped for this query.
        
        Args:
            query: User query string
            
        Returns:
            Tuple of (should_skip, reason)
        """
        if not query or not query.strip():
            return True, "Empty query"
        
        # Check word count
        words = query.strip().split()
        if len(words) < self._config.min_query_words:
            return True, f"Short query ({len(words)} words)"
        
        # Check for common fillers
        cleaned_query = query.strip().lower()
        for pattern in self._config.skip_patterns:
            if cleaned_query.startswith(pattern):
                return True, f"Common greeting/filler: '{pattern}'"
        
        return False, ""
    
    def _check_providers(self) -> tuple[bool, str]:
        """Check if required providers are available."""
        if not self._state.embedding_provider.is_available():
            return False, "Embedding provider not available"
        if not self._state.database_provider.is_available():
            return False, "Database provider not available"
        return True, ""
    
    @staticmethod
    def _convert_results(results: Sequence["VectorSearchResult"]) -> list[RAGResult]:
        """Convert provider results to RAGResult format."""
        return [
            RAGResult(
                text=r.text,
                score=r.score,
                metadata=r.metadata,
            )
            for r in results
        ]
    
    async def get_context(
        self,
        query: str,
        history: list | None = None,
        org_id: str | None = None,
    ) -> list[RAGResult]:
        """
        Get relevant context for a user query.
        
        Args:
            query: User query string
            history: Optional conversation history (for future context-aware retrieval)
            org_id: Organization ID for multi-tenant filtering (optional)
            
        Returns:
            List of RAGResult objects sorted by relevance
        """
        # Check if we should skip RAG
        should_skip, reason = self.should_skip_query(query)
        if should_skip:
            logger.debug("Skipping RAG: %s", reason)
            return []
        
        # Check provider availability
        available, error = self._check_providers()
        if not available:
            logger.warning("RAG skipped: %s", error)
            return []
        
        # Generate embedding
        try:
            embedding = await self._state.embedding_provider.generate_embedding(query)
            if not embedding:
                logger.warning("RAG skipped: Failed to generate embedding")
                return []
        except Exception as e:
            logger.error("Embedding generation failed: %s", e)
            return []
        
        # Search vector store with org_id filter
        try:
            search_results = await self._state.database_provider.search_similar(
                embedding=embedding,
                top_k=self._config.top_k,
                similarity_threshold=self._config.similarity_threshold,
                org_id=org_id,
            )
        except Exception as e:
            logger.error("Vector search failed: %s", e)
            return []
        
        # Convert and return results
        results = self._convert_results(search_results)
        
        if results:
            logger.info(
                "RAG retrieved %d results (top score: %.3f) for org_id=%s",
                len(results),
                results[0].score if results else 0,
                org_id or "default",
            )
        
        return results


# =============================================================================
# Convenience Functions (for backward compatibility)
# =============================================================================

def should_skip_rag(query: str, history: list | None = None) -> bool:
    """
    Determine if RAG should be skipped for this query.
    
    This is a convenience function for backward compatibility.
    Consider using RAGService.should_skip_query() for more detail.
    
    Args:
        query: User query string
        history: Conversation history (unused, for API compatibility)
        
    Returns:
        True if RAG should be skipped
    """
    config = RAGConfig()
    
    if not query or not query.strip():
        return True
    
    words = query.strip().split()
    if len(words) < config.min_query_words:
        logger.debug("Skipping RAG: Short query (%d words)", len(words))
        return True
    
    cleaned_query = query.strip().lower()
    for pattern in config.skip_patterns:
        if cleaned_query.startswith(pattern):
            logger.debug("Skipping RAG: Common filler starts with '%s'", pattern)
            return True
    
    return False


async def get_rag_context(
    query: str,
    state: "AppState",
    history: list | None = None,
    org_id: str | None = None,
) -> list[RAGResult]:
    """
    Get RAG context for a user query.
    
    This is a convenience function that creates a RAGService instance
    and retrieves context. For repeated calls, consider using RAGService
    directly to avoid repeated instantiation.
    
    Args:
        query: User query string
        state: Application state with providers
        history: Optional conversation history
        org_id: Organization ID for multi-tenant filtering (optional)
        
    Returns:
        List of RAGResult objects
    """
    service = RAGService(state)
    return await service.get_context(query, history, org_id)
