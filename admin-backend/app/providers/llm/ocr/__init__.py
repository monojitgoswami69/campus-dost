"""Generic OCR provider."""
from .interface import OCRProviderInterface
from .gemini_impl import GeminiOCRProvider

# Factory pattern - only Gemini implementation for now
ocr_provider: OCRProviderInterface = GeminiOCRProvider()

__all__ = ['ocr_provider', 'OCRProviderInterface']
