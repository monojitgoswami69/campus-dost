from abc import ABC, abstractmethod
from typing import List

class EmbeddingProviderInterface(ABC):
    """Abstract interface for embedding generation providers."""
    
    @abstractmethod
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        pass
    
    @abstractmethod
    def get_dimensions(self) -> int:
        """Get the embedding dimensions."""
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Get the model name."""
        pass
