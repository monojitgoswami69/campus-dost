from abc import ABC, abstractmethod

class ExtractorInterface(ABC):
    """Abstract interface for text extractors."""
    
    @abstractmethod
    def can_handle(self, extension: str, mime_type: str) -> bool:
        """Check if this extractor can handle the given file type."""
        pass
    
    @abstractmethod
    def extract(self, file_path: str) -> str:
        """Extract text from a file."""
        pass
