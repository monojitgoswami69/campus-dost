"""
Shared Firebase Admin initialization for all database providers.

Uses firebase-admin SDK for full Firebase functionality including:
- Firestore AsyncClient for non-blocking database I/O
- Firebase Authentication for user management
- Unified credential management
"""
import os
import json
import base64

import firebase_admin
from firebase_admin import credentials, firestore, auth
from google.cloud.firestore import AsyncClient
from google.oauth2 import service_account

from ...config import settings, logger

_firebase_app = None
_async_client: AsyncClient | None = None
_credentials_dict = None


def _get_credentials():
    """Get Firebase credentials from config. Returns tuple (firebase_admin_cred, credentials_dict)."""
    global _credentials_dict
    
    # Prioritize local file over base64
    if settings.FIREBASE_CRED_PATH and os.path.exists(settings.FIREBASE_CRED_PATH):
        with open(settings.FIREBASE_CRED_PATH, 'r') as f:
            _credentials_dict = json.load(f)
        return credentials.Certificate(settings.FIREBASE_CRED_PATH), _credentials_dict
    
    if settings.FIREBASE_CRED_BASE64:
        try:
            cred_json = base64.b64decode(settings.FIREBASE_CRED_BASE64).decode('utf-8')
            _credentials_dict = json.loads(cred_json)
            return credentials.Certificate(_credentials_dict), _credentials_dict
        except Exception as e:
            logger.error(f"Failed to decode base64 credentials: {e}")
    
    # Fall back to ADC (Application Default Credentials)
    return None, None


def initialize_firebase():
    """
    Initialize Firebase Admin SDK and Firestore AsyncClient.
    
    This provides:
    - Firebase Authentication (firebase_admin.auth)
    - Firestore AsyncClient for non-blocking database operations
    
    Returns the async Firestore client.
    """
    global _firebase_app, _async_client, _credentials_dict
    
    # Initialize Firebase Admin SDK if not already done
    if _firebase_app is None:
        try:
            # Check if already initialized elsewhere
            _firebase_app = firebase_admin.get_app()
            logger.info("Firebase Admin SDK already initialized")
        except ValueError:
            # Not initialized, initialize now
            cred, cred_dict = _get_credentials()
            if cred:
                _firebase_app = firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized with credentials")
            else:
                _firebase_app = firebase_admin.initialize_app()
                logger.info("Firebase Admin SDK initialized with default credentials")
    
    # Initialize Firestore AsyncClient if not already done
    if _async_client is None:
        # Get the project ID from the initialized app
        project_id = _firebase_app.project_id if _firebase_app else None
        
        # Create AsyncClient with the same credentials
        if _credentials_dict:
            # Use service account credentials from the dict
            creds = service_account.Credentials.from_service_account_info(_credentials_dict)
            _async_client = AsyncClient(project=project_id, credentials=creds)
            logger.info(f"Firestore AsyncClient initialized with credentials (project: {project_id})")
        elif project_id:
            # Try without explicit credentials (will use ADC)
            _async_client = AsyncClient(project=project_id)
            logger.info(f"Firestore AsyncClient initialized with default credentials (project: {project_id})")
        else:
            _async_client = AsyncClient()
            logger.info("Firestore AsyncClient initialized with defaults")
    
    return _async_client


def get_db() -> AsyncClient:
    """Get initialized async Firestore client."""
    if _async_client is None:
        raise RuntimeError("Firestore not initialized. Call initialize_firebase() first.")
    return _async_client


def get_auth():
    """Get Firebase Auth module for user management."""
    if _firebase_app is None:
        raise RuntimeError("Firebase not initialized. Call initialize_firebase() first.")
    return auth


async def close_db():
    """Close the async Firestore client."""
    global _async_client
    if _async_client:
        _async_client.close()
        _async_client = None
        logger.info("Firestore AsyncClient closed")


__all__ = ['initialize_firebase', 'get_db', 'get_auth', 'close_db']
