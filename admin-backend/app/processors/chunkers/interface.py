from abc import ABC, abstractmethod
from typing import List

class ChunkerInterface(ABC):
    """Abstract interface for text chunkers."""
    
    @abstractmethod
    async def chunk(self, text: str) -> List[str]:
        """Split text into chunks."""
        pass
