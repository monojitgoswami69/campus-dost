import logging
import dropbox
from dropbox.files import WriteMode
from dropbox.exceptions import ApiError
from .interface import StorageProviderInterface
from ...config import settings
from ...exceptions import AppException

logger = logging.getLogger("storage-provider")

class DropboxStorageError(AppException):
    """Dropbox-specific storage errors."""
    def __init__(self, message: str, details=None):
        super().__init__(message, status_code=502, details=details)

class DropboxStorageProvider(StorageProviderInterface):
    """
    Dropbox storage provider with flat file architecture.
    
    Architecture: All files stored in /documents/{doc_id}.{ext}
    - Archive status is managed in Firestore metadata (archived boolean)
    - Files do NOT move between folders when archived/restored
    - This provides simpler, more reliable storage with lower latency
    """
    
    def __init__(self):
        self.app_key = settings.DROPBOX_APP_KEY
        self.app_secret = settings.DROPBOX_APP_SECRET
        self.refresh_token = settings.DROPBOX_REFRESH_TOKEN
        self.dbx = None
        self._authenticate()

    def _authenticate(self):
        """Initialize Dropbox client with OAuth2 refresh token."""
        try:
            if not all([self.app_key, self.app_secret, self.refresh_token]):
                raise DropboxStorageError("Missing Dropbox credentials in configuration")

            self.dbx = dropbox.Dropbox(
                app_key=self.app_key,
                app_secret=self.app_secret,
                oauth2_refresh_token=self.refresh_token
            )
            # Verify connection
            self.dbx.users_get_current_account()
            logger.info("Dropbox Storage Connected")
        except DropboxStorageError:
            raise
        except Exception as e:
            logger.error(f"Dropbox authentication failed: {e}")
            raise DropboxStorageError(f"Failed to authenticate with Dropbox: {e}")

    def _get_storage_path(self, doc_id: str, filename: str) -> str:
        """Generate consistent storage path for a document."""
        ext = ""
        if "." in filename:
            ext = "." + filename.split(".")[-1]
        return f"/documents/{doc_id}{ext}"

    async def upload_file(self, doc_id: str, filename: str, content: bytes, message: str) -> dict:
        """
        Upload file to Dropbox in flat structure.
        
        Returns standardized dict with:
        - storage_path: Dropbox file path
        - storage_sha: File content hash (for compatibility)
        - storage_url: Shareable URL (Dropbox format)
        """
        if not self.dbx:
            raise DropboxStorageError("Storage client not initialized")
        
        path = self._get_storage_path(doc_id, filename)

        try:
            # WriteMode.overwrite ensures idempotency
            meta = self.dbx.files_upload(
                content, 
                path, 
                mode=WriteMode.overwrite,
                mute=True  # Don't notify users
            )
            
            # Standardized return structure (compatible with GitHub provider)
            return {
                "storage_path": path,
                "storage_sha": meta.content_hash,  # Dropbox's hash, compatible key name
                "storage_url": f"https://www.dropbox.com/home{path}"  # Web URL format
            }
        except ApiError as e:
            logger.error(f"Dropbox upload failed for {doc_id}: {e}")
            raise DropboxStorageError(f"Upload failed: {e.user_message_text or str(e)}")

    async def download_file(self, doc_id: str, filename: str, archived: bool = False) -> bytes:
        """
        Download file from Dropbox.
        
        Note: archived parameter is ignored in flat storage architecture.
        Files remain in same location regardless of archive status.
        """
        if not self.dbx:
            raise DropboxStorageError("Storage client not initialized")

        path = self._get_storage_path(doc_id, filename)

        try:
            _, response = self.dbx.files_download(path)
            return response.content
        except ApiError as e:
            if e.error.is_path() and e.error.get_path().is_not_found():
                return None  # File not found - return None per interface
            logger.error(f"Dropbox download failed for {doc_id}: {e}")
            raise DropboxStorageError(f"Download failed: {e.user_message_text or str(e)}")

    async def delete_file(self, doc_id: str, filename: str, archived: bool, message: str) -> bool:
        """
        Delete file from Dropbox.
        
        Note: archived parameter is ignored in flat storage architecture.
        Files remain in /documents/ regardless of archive status.
        """
        if not self.dbx:
            raise DropboxStorageError("Storage client not initialized")
        
        path = self._get_storage_path(doc_id, filename)

        try:
            self.dbx.files_delete_v2(path)
            logger.info(f"Deleted {path} from Dropbox")
            return True
        except ApiError as e:
            if e.error.is_path_lookup() and e.error.get_path_lookup().is_not_found():
                logger.warning(f"File not found for deletion: {path}")
                return False  # Already deleted or never existed
            logger.error(f"Dropbox delete failed for {doc_id}: {e}")
            raise DropboxStorageError(f"Delete failed: {e.user_message_text or str(e)}")