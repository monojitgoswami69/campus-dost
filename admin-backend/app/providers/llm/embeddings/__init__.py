"""Generic embedding provider."""
from .interface import EmbeddingProviderInterface
from .gemini_impl import GeminiEmbeddingProvider

# Factory pattern - only Gemini implementation for now
embedding_provider: EmbeddingProviderInterface = GeminiEmbeddingProvider()

__all__ = ['embedding_provider', 'EmbeddingProviderInterface']
