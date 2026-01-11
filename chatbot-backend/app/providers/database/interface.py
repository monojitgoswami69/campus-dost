"""
Abstract interface for vector database providers.

All database providers must implement this interface to ensure
consistent behavior and easy hot-swapping.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class VectorSearchResult:
    """Result from a vector similarity search."""
    text: str
    score: float  # Similarity score (0.0 to 1.0, higher is better)
    metadata: Optional[dict] = None


class DatabaseProviderInterface(ABC):
    """
    Abstract interface for vector database providers.
    
    All implementations must provide:
    - Vector similarity search
    - Connection management
    - Provider information
    """
    
    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialize the database connection.
        
        Returns:
            True if initialization succeeded, False otherwise
        """
        pass
    
    @abstractmethod
    async def search_similar(
        self,
        embedding: List[float],
        top_k: int = 5,
        similarity_threshold: float = 0.0,
        org_id: str | None = None,
    ) -> List[VectorSearchResult]:
        """
        Search for similar documents by vector embedding.
        
        Args:
            embedding: Query embedding vector
            top_k: Maximum number of results to return
            similarity_threshold: Minimum similarity score (0.0-1.0)
            org_id: Organization ID for multi-tenant filtering (optional)
            
        Returns:
            List of VectorSearchResult objects, sorted by score (descending)
        """
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name (e.g., 'firestore', 'pinecone')."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the database connection is available."""
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """Close the database connection."""
        pass
    
    async def get_system_instructions(self, org_id: str) -> str | None:
        """
        Get system instructions for an organization from Firestore.
        
        Args:
            org_id: Organization identifier
            
        Returns:
            System instruction content string or None if not found
        """
        # Default implementation returns None
        # Override in Firestore provider
        return None
