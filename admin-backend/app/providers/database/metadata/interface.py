from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime

class MetadataProviderInterface(ABC):
    """Abstract interface for document metadata storage providers."""
    
    @abstractmethod
    def generate_id(self) -> str:
        """Generate a unique document ID."""
        pass
    
    @abstractmethod
    async def create_document(self, doc_id: str, data: dict, archived: bool = False) -> str:
        """Create a document metadata record."""
        pass
    
    @abstractmethod
    async def get_document(self, doc_id: str, archived: bool = False) -> Optional[dict]:
        """Get document metadata by ID."""
        pass
    
    @abstractmethod
    async def list_documents(self, limit: int, archived: bool = False) -> List[dict]:
        """List documents with optional limit."""
        pass
    
    @abstractmethod
    async def delete_document(self, doc_id: str, archived: bool = False) -> bool:
        """Delete document metadata."""
        pass
    
    @abstractmethod
    async def update_document(self, doc_id: str, updates: dict) -> bool:
        """Update specific fields in a document."""
        pass
    
    @abstractmethod
    async def get_document_count(self) -> dict:
        """Get counts of active and archived documents."""
        pass
    
    @abstractmethod
    async def get_expired_archives(self, cutoff_date: datetime) -> List[dict]:
        """Get archived documents older than cutoff date."""
        pass
    
    @abstractmethod
    async def cleanup_old_archives(self, days: int) -> dict:
        """
        Cleanup archived documents older than specified days.
        
        Returns:
            dict with 'deleted_count' (int) and 'documents' (list of deleted doc info)
        """
        pass
