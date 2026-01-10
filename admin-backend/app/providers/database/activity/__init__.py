"""Generic activity logging provider."""
from .interface import ActivityProviderInterface
from .firestore_impl import FirestoreActivityProvider

# Factory pattern - only Firestore implementation for now
activity_provider: ActivityProviderInterface = FirestoreActivityProvider()

__all__ = ['activity_provider', 'ActivityProviderInterface']
