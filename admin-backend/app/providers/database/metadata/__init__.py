"""Generic document metadata provider."""
from .interface import MetadataProviderInterface
from .firestore_impl import FirestoreMetadataProvider

# Factory pattern - only Firestore implementation for now
metadata_provider: MetadataProviderInterface = FirestoreMetadataProvider()

__all__ = ['metadata_provider', 'MetadataProviderInterface']
