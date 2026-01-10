from pdfminer.high_level import extract_text as extract_text_pdf
from .interface import ExtractorInterface

class PDFExtractor(ExtractorInterface):
    """PDF text extraction using pdfminer.six."""
    
    def can_handle(self, extension: str, mime_type: str) -> bool:
        return extension == ".pdf" or mime_type == "application/pdf"
    
    def extract(self, file_path: str) -> str:
        return extract_text_pdf(file_path)
