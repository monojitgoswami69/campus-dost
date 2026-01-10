from abc import ABC, abstractmethod
from typing import List, Optional

class VectorStorageInterface(ABC):
    """Abstract interface for vector storage providers."""
    
    @abstractmethod
    async def store_vectors(self, doc_id: str, vector_data: List[dict]) -> int:
        """Store vector embeddings for a document."""
        pass
    
    @abstractmethod
    async def get_vectors(self, doc_id: str, archived: bool = False) -> Optional[dict]:
        """Get all vectors for a document."""
        pass
    
    @abstractmethod
    async def delete_vectors(self, doc_id: str, archived: bool = False) -> bool:
        """Delete all vectors for a document."""
        pass
    
    @abstractmethod
    async def archive_vectors(self, doc_id: str) -> int:
        """Move vectors to archived collection."""
        pass
    
    @abstractmethod
    async def restore_vectors(self, doc_id: str) -> int:
        """Restore vectors from archived collection."""
        pass
