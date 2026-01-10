from typing import Tuple, List
from datetime import datetime
from ..processors.cleaners import text_cleaner
from ..processors.chunkers import text_chunker

class DeterministicTextProcessor:
    """Wrapper service for backward compatibility."""
    
    async def clean_and_chunk(self, raw_text: str, generate_filename: bool = False) -> Tuple[List[str], str]:
        cleaned = text_cleaner.clean(raw_text)
        chunks = await text_chunker.chunk(cleaned)
        filename = f"{datetime.now().strftime('%Y%m%d')}_doc.txt"
        return chunks, filename

    async def generate_preview(self, text: str) -> dict:
        chunks, name = await self.clean_and_chunk(text, True)
        return {
            "chunks": [{"id": i + 1, "content": c, "chars": len(c)} for i, c in enumerate(chunks)],
            "suggested_name": name,
            "cleaned_text": "\n\n".join(chunks),
            "total_chunks": len(chunks),
            "total_chars": sum(len(c) for c in chunks)
        }

text_processor = DeterministicTextProcessor()
