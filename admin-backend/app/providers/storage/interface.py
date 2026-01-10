from abc import ABC, abstractmethod
from typing import Optional

class StorageProviderInterface(ABC):
    """
    Abstract interface for document storage providers.
    
    All providers must return standardized data structures to ensure
    modularity and swappability between different storage backends.
    """
    
    @abstractmethod
    async def upload_file(self, doc_id: str, filename: str, content: bytes, message: str) -> dict:
        """
        Upload a file to storage.
        
        Args:
            doc_id: Unique document identifier
            filename: Original filename (used for extension detection)
            content: File content as bytes
            message: Commit/upload message for providers that support versioning
        
        Returns:
            dict with standardized keys:
            - storage_path (str): Provider-specific path/identifier
            - storage_sha (str|None): Content hash/SHA (None if provider doesn't support)
            - storage_url (str): Web-accessible URL or URI for the file
        
        Raises:
            AppException subclass on storage errors
        """
        pass
    
    @abstractmethod
    async def download_file(self, doc_id: str, filename: str, archived: bool = False) -> Optional[bytes]:
        """
        Download a file from storage.
        
        Args:
            doc_id: Unique document identifier
            filename: Original filename
            archived: Whether to look in archived location (provider-specific)
        
        Returns:
            File content as bytes, or None if file not found
        
        Raises:
            AppException subclass on storage errors (not for "not found")
        
        Note:
            Some providers (e.g., Dropbox flat storage) may ignore the
            archived flag as files don't move between locations.
        """
        pass
    
    @abstractmethod
    async def delete_file(self, doc_id: str, filename: str, archived: bool, message: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            doc_id: Unique document identifier
            filename: Original filename
            archived: Whether file is in archived location (ignored in flat storage)
            message: Deletion reason/message
        
        Returns:
            True if deleted, False if file not found
        
        Raises:
            AppException subclass on storage errors
        """
        pass
