"""Handoff provider for admin backend."""
from .interface import HandoffProviderInterface
from .firestore_impl import FirestoreHandoffProvider

# Factory pattern
handoff_provider: HandoffProviderInterface = FirestoreHandoffProvider()

__all__ = ['handoff_provider', 'HandoffProviderInterface']
