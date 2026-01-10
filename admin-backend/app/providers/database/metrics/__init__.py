"""Generic metrics provider."""
from .interface import MetricsProviderInterface
from .firestore_impl import FirestoreMetricsProvider

# Factory pattern - only Firestore implementation for now
metrics_provider: MetricsProviderInterface = FirestoreMetricsProvider()

__all__ = ['metrics_provider', 'MetricsProviderInterface']
