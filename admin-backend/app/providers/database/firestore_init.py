"""
Shared Firestore initialization for all database providers.

Uses google-cloud-firestore AsyncClient for non-blocking async I/O.
No firebase-admin dependency needed - we only use Firestore.
"""
import os
import json
import base64
import tempfile

from google.cloud import firestore
from google.oauth2 import service_account

from ...config import settings, logger

_async_client: firestore.AsyncClient | None = None
_credentials = None


def _get_credentials():
    """Get Google Cloud credentials from config."""
    global _credentials
    if _credentials is not None:
        return _credentials
    
    # Prioritize local file over base64
    if settings.FIREBASE_CRED_PATH and os.path.exists(settings.FIREBASE_CRED_PATH):
        _credentials = service_account.Credentials.from_service_account_file(
            settings.FIREBASE_CRED_PATH
        )
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.FIREBASE_CRED_PATH
        return _credentials
    
    if settings.FIREBASE_CRED_BASE64:
        try:
            cred_json = base64.b64decode(settings.FIREBASE_CRED_BASE64).decode('utf-8')
            cred_dict = json.loads(cred_json)
            _credentials = service_account.Credentials.from_service_account_info(cred_dict)
            # Also write to temp file for GOOGLE_APPLICATION_CREDENTIALS
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(cred_dict, f)
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = f.name
            return _credentials
        except Exception as e:
            logger.error(f"Failed to decode base64 credentials: {e}")
    
    # Fall back to ADC (Application Default Credentials)
    return None


def initialize_firebase():
    """
    Initialize Firestore AsyncClient for non-blocking operations.
    
    Returns the async Firestore client. No firebase-admin needed.
    """
    global _async_client
    if _async_client is not None:
        return _async_client
    
    creds = _get_credentials()
    
    # Create AsyncClient directly - no firebase-admin wrapper needed
    if creds:
        _async_client = firestore.AsyncClient(credentials=creds)
    else:
        _async_client = firestore.AsyncClient()
    
    logger.info("Firestore AsyncClient initialized (lightweight, no firebase-admin)")
    return _async_client


def get_db() -> firestore.AsyncClient:
    """Get initialized async Firestore client."""
    if _async_client is None:
        raise RuntimeError("Firestore not initialized. Call initialize_firebase() first.")
    return _async_client


async def close_db():
    """Close the async Firestore client."""
    global _async_client
    if _async_client:
        _async_client.close()
        _async_client = None
        logger.info("Firestore AsyncClient closed")


__all__ = ['initialize_firebase', 'get_db', 'close_db']
