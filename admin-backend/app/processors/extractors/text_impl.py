from .interface import ExtractorInterface

class TextExtractor(ExtractorInterface):
    """Plain text file extraction."""
    
    def can_handle(self, extension: str, mime_type: str) -> bool:
        # Handle any text-based formats not covered by other extractors
        return True  # This is the fallback extractor
    
    def extract(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
