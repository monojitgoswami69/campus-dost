"""
Handoff Provider - Factory module for human handoff operations.

Provides functionality to store and manage human handoff requests
when the chatbot cannot answer a query from context.
"""

from app.config import settings, get_logger
from .firestore_impl import FirestoreHandoffProvider

logger = get_logger("handoff.provider")

# Factory pattern - select implementation
handoff_provider = FirestoreHandoffProvider()
logger.info("Handoff Provider: Firestore")

__all__ = ["handoff_provider", "FirestoreHandoffProvider"]
