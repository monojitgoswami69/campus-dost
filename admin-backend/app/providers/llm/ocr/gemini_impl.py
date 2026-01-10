from google import genai
from google.genai import types
from ....config import settings, logger
from ....exceptions import FileExtractionError
from .interface import OCRProviderInterface

class GeminiOCRProvider(OCRProviderInterface):
    """Gemini Vision-based OCR with round-robin API key rotation."""
    
    def __init__(self):
        self.model = settings.GEMINI_OCR_MODEL

    def _get_client(self):
        """Create a new client with next API key in round-robin."""
        api_key = settings.get_ocr_api_key()
        if not api_key:
            raise FileExtractionError("Gemini API key not configured")
        return genai.Client(api_key=api_key)

    def extract_text(self, image_bytes: bytes, mime_type: str) -> str:
        try:
            client = self._get_client()
            # Use synchronous generate_content since this will be called from threadpool
            response = client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    "Transcribe the text from this image exactly. Preserve structure."
                ]
            )
            return response.text
        except Exception as e:
            logger.error(f"OCR Failed: {e}")
            raise FileExtractionError(f"Failed to extract text from image: {e}")
