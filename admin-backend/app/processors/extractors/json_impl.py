import json
from .interface import ExtractorInterface

class JSONExtractor(ExtractorInterface):
    """JSON file text extraction."""
    
    def can_handle(self, extension: str, mime_type: str) -> bool:
        return extension == ".json" or mime_type == "application/json"
    
    def extract(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.dumps(json.load(f), indent=2, ensure_ascii=False)
