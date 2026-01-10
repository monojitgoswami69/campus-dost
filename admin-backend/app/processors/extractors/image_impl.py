from ...providers.llm.ocr import ocr_provider
from .interface import ExtractorInterface

class ImageExtractor(ExtractorInterface):
    """Image text extraction using OCR provider."""
    
    def can_handle(self, extension: str, mime_type: str) -> bool:
        return mime_type.startswith("image/")
    
    def extract(self, file_path: str) -> str:
        with open(file_path, "rb") as f:
            image_bytes = f.read()
        
        # Determine mime type based on extension
        ext_to_mime = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp'
        }
        mime_type = ext_to_mime.get(file_path[file_path.rfind('.'):].lower(), 'image/jpeg')
        
        return ocr_provider.extract_text(image_bytes, mime_type)
