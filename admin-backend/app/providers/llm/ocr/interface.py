from abc import ABC, abstractmethod

class OCRProviderInterface(ABC):
    """Abstract interface for OCR (image text extraction) providers."""
    
    @abstractmethod
    def extract_text(self, image_bytes: bytes, mime_type: str) -> str:
        """Extract text from an image."""
        pass
