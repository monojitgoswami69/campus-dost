"""Document text extraction with automatic format detection."""
import os
from pathlib import Path
from typing import List
from ...config import settings, logger
from ...exceptions import FileExtractionError, FileSizeError, UnsupportedFileTypeError
from .interface import ExtractorInterface
from .pdf_impl import PDFExtractor
from .image_impl import ImageExtractor
from .json_impl import JSONExtractor
from .text_impl import TextExtractor

try:
    import magic
except (ImportError, Exception):
    magic = None

class DocumentExtractor:
    """Orchestrates text extraction from various file formats."""
    
    def __init__(self):
        # Order matters - more specific extractors first
        self.extractors: List[ExtractorInterface] = [
            PDFExtractor(),
            ImageExtractor(),
            JSONExtractor(),
            TextExtractor()  # Fallback
        ]
    
    def extract(self, file_path: str) -> str:
        """Extract text from a file using the appropriate extractor."""
        if not os.path.exists(file_path):
            raise FileExtractionError(f"File not found: {file_path}")
        
        file_size = os.path.getsize(file_path)
        if file_size > settings.MAX_FILE_SIZE:
            raise FileSizeError(f"File size {file_size} exceeds limit {settings.MAX_FILE_SIZE}")
        
        try:
            mime = magic.from_file(file_path, mime=True) if magic else "application/octet-stream"
        except Exception:
            mime = "application/octet-stream"
        
        ext = Path(file_path).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise UnsupportedFileTypeError(f"File type {ext} not supported")
        
        # Find appropriate extractor
        for extractor in self.extractors:
            if extractor.can_handle(ext, mime):
                logger.info(f"Using {extractor.__class__.__name__} for {file_path}")
                return extractor.extract(file_path)
        
        raise UnsupportedFileTypeError(f"No extractor found for {ext} / {mime}")

# Generic singleton
document_extractor = DocumentExtractor()

__all__ = ['document_extractor', 'DocumentExtractor', 'ExtractorInterface']
