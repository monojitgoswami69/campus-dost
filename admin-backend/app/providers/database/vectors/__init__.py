"""Generic vector storage provider."""
from .interface import VectorStorageInterface
from .firestore_impl import FirestoreVectorStorage

# Factory pattern - only Firestore implementation for now
vector_storage_provider: VectorStorageInterface = FirestoreVectorStorage()

__all__ = ['vector_storage_provider', 'VectorStorageInterface']
