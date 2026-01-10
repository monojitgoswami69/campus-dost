import os
import hashlib
import secrets
import logging
import re
from typing import Any
from dotenv import load_dotenv

class Settings:
    def __init__(self):
        load_dotenv(override=True)

        def get_req(key: str) -> str:
            val = os.getenv(key)
            if val is None or val.strip() == "":
                raise ValueError(f"Missing required environment variable: {key}")
            return val

        def get_opt(key: str, default: Any = None) -> Any:
            return os.getenv(key, default)

        # --- Server Settings ---
        # Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        self.LOG_LEVEL = get_opt("LOG_LEVEL", "INFO").upper()

        # --- Storage Provider ---
        # Storage provider type: "dropbox" or "github" (default: dropbox)
        # Note: system-instructions always uses GitHub regardless of this setting
        self.STORAGE_PROVIDER = get_opt("STORAGE_PROVIDER", "dropbox")
        
        # Dropbox settings
        self.DROPBOX_APP_KEY = get_opt("DROPBOX_APP_KEY", "")
        self.DROPBOX_APP_SECRET = get_opt("DROPBOX_APP_SECRET", "")
        self.DROPBOX_REFRESH_TOKEN = get_opt("DROPBOX_REFRESH_TOKEN", "")

        # --- Authentication ---
        # JWT secret key (REQUIRED - must be kept secret)
        self.JWT_SECRET = get_req("JWT_SECRET")
        # JWT signing algorithm (default: HS256)
        self.JWT_ALGORITHM = get_opt("JWT_ALGORITHM", "HS256")
        # JWT token expiration time in minutes (default: 1440 = 24 hours)
        self.JWT_EXPIRATION_MINUTES = int(get_opt("JWT_EXPIRATION_MINUTES", 60))
        # JWT refresh threshold in minutes - tokens refresh when this much time remains (default: 15)
        self.JWT_REFRESH_THRESHOLD_MINUTES = int(get_opt("JWT_REFRESH_THRESHOLD_MINUTES", 15))
        # Admin username (REQUIRED)
        self.ADMIN_USERNAME = get_req("ADMIN_USERNAME")
        # Admin password (REQUIRED - hashed with SHA256)
        self._admin_password_hash = hashlib.sha256(get_req("ADMIN_PASSWORD").encode()).hexdigest()

        # --- Firebase ---
        self.FIREBASE_CRED_PATH = get_opt("FIREBASE_CRED_PATH")
        self.FIREBASE_CRED_BASE64 = get_opt("FIREBASE_CRED_BASE64")
        if not self.FIREBASE_CRED_PATH and not self.FIREBASE_CRED_BASE64:
            if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                raise ValueError("No Firebase credentials provided")

        # --- Firestore Collections ---
        # Application constants with sensible defaults (rarely need to change)
        # Note: These are configuration constants, not sensitive data
        
        # Main documents collection - stores both active and archived documents (filtered by archived field)
        self.DOCUMENTS_COLLECTION = get_opt("DOCUMENTS_COLLECTION", "documents")
        # Vector embeddings collection - stores embeddings with archived field matching documents
        self.VECTOR_STORE_COLLECTION = get_opt("VECTOR_STORE_COLLECTION", "vector_store")
        
        # Metrics and monitoring collections
        self.METRICS_COLLECTION = get_opt("METRICS_COLLECTION", "metrics")
        self.WEEKLY_METRICS_COLLECTION = get_opt("WEEKLY_METRICS_COLLECTION", "weekly_metrics")
        self.ACTIVITY_LOG_COLLECTION = get_opt("ACTIVITY_LOG_COLLECTION", "activity_log")
        self.SYSTEM_INSTRUCTIONS_HISTORY_COLLECTION = get_opt("SYSTEM_INSTRUCTIONS_HISTORY_COLLECTION", "system_instructions_history")
        
        # Firestore batch size for bulk operations (max: 500, default: 400 for safety margin)
        self.FIRESTORE_BATCH_SIZE = int(get_opt("FIRESTORE_BATCH_SIZE", 400))

        # --- Google Gemini AI ---
        # Gemini API keys CSV (REQUIRED) - comma-separated list for round-robin load balancing
        # Format: key1,key2,key3 or single key: key1
        gemini_keys_csv = get_req("GEMINI_API_KEYS_CSV")
        self.GEMINI_API_KEYS = [k.strip() for k in gemini_keys_csv.split(",") if k.strip()]
        if not self.GEMINI_API_KEYS:
            raise ValueError("GEMINI_API_KEYS_CSV must contain at least one valid API key")
        
        # Round-robin key rotation state (separate indices for embedding and OCR)
        self._embedding_key_index = 0
        self._ocr_key_index = 0
        
        # Embedding model name (default: gemini-embedding-001)
        self.GEMINI_EMBEDDING_MODEL = get_opt("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
        # OCR model for image processing (default: gemini-2.5-flash)
        self.GEMINI_OCR_MODEL = get_opt("GEMINI_OCR_MODEL", "gemini-2.5-flash")
        # Embedding vector dimensions (default: 768)
        self.EMBEDDING_DIMENSIONS = int(get_opt("EMBEDDING_DIMENSIONS", 768))
        
        # Embedding generation concurrency and batching
        # Number of concurrent embedding requests (default: 10)
        self.EMBEDDING_CONCURRENCY = int(get_opt("EMBEDDING_CONCURRENCY", 10))
        # Number of text chunks per embedding batch (default: 99)
        self.EMBEDDING_BATCH_SIZE = int(get_opt("EMBEDDING_BATCH_SIZE", 99))
        # Maximum text length per embedding (characters, default: 1000)
        self.EMBEDDING_TEXT_LIMIT = int(get_opt("EMBEDDING_TEXT_LIMIT", 1000))

        # --- GitHub Integration ---
        # GitHub personal access token (REQUIRED - needs repo read/write permissions)
        self.GITHUB_TOKEN = get_req("GITHUB_TOKEN")
        # GitHub repository for configuration (format: owner/repo)
        self.GITHUB_REPO = get_req("GITHUB_REPO")
        # GitHub repository for documents (optional, defaults to GITHUB_REPO)
        self.GITHUB_DOCS_REPO = get_opt("GITHUB_DOCS_REPO", None)
        # GitHub branch to use (default: main)
        self.GITHUB_BRANCH = get_opt("GITHUB_BRANCH", "main")
        # Path in repo for system instructions (always uses GitHub, not Dropbox)
        self.GITHUB_SYS_INS_PATH = get_req("GITHUB_SYS_INS_PATH")
        # Path in repo for active documents (when using GitHub storage provider)
        self.GITHUB_DOCUMENTS_PATH = get_opt("GITHUB_DOCUMENTS_PATH", "documents")
        # Path in repo for archived documents (when using GitHub storage provider)
        self.GITHUB_ARCHIVED_PATH = get_opt("GITHUB_ARCHIVED_PATH", "archived")
        # HTTP client timeout for GitHub API requests in seconds (default: 60)
        self.HTTP_CLIENT_TIMEOUT = float(get_opt("HTTP_CLIENT_TIMEOUT", 60.0))

        # --- Document Processing Limits ---
        # Maximum file upload size in bytes (default: 10MB = 10485760)
        self.MAX_FILE_SIZE = int(get_opt("MAX_FILE_SIZE", 10485760))
        # Days to retain archived documents before cleanup (default: 30)
        self.ARCHIVE_RETENTION_DAYS = int(get_opt("ARCHIVE_RETENTION_DAYS", 30))
        # Maximum text length for direct text input (default: 10,000,000 characters)
        self.TEXT_MAX_LENGTH = int(get_opt("TEXT_MAX_LENGTH", 10_000_000))
        
        # --- File Extension Whitelist ---
        # Allowed file extensions for uploads (comma-separated, include dots)
        default_exts = ".pdf,.json,.txt,.md,.png,.jpg,.jpeg,.webp"
        self.ALLOWED_EXTENSIONS = set(get_opt("ALLOWED_EXTENSIONS", default_exts).split(","))

        # --- Semantic Chunking Configuration ---
        # Hierarchical semantic chunking for intelligent document splitting
        # Atomic chunk size in characters - smallest semantic unit (default: 500)
        self.SEMANTIC_ATOMIC_SIZE = int(get_opt("SEMANTIC_ATOMIC_SIZE", 500))
        # Similarity threshold for chunk merging (0.0-1.0, default: 0.5)
        # Higher values = more similar chunks required to merge
        self.SEMANTIC_SIMILARITY_THRESHOLD = float(get_opt("SEMANTIC_SIMILARITY_THRESHOLD", 0.5))
        # Maximum chunk size after merging in characters (default: 2000)
        self.SEMANTIC_MAX_CHUNK_SIZE = int(get_opt("SEMANTIC_MAX_CHUNK_SIZE", 2000))

        # --- Rate Limiting ---
        # API rate limits using slowapi (format: "count/period" e.g. "100/minute")
        # Default rate limit for most endpoints (default: 100/minute)
        self.RATE_LIMIT_DEFAULT = get_opt("RATE_LIMIT_DEFAULT", "100/minute")
        # Upload endpoint rate limit (default: 10/minute)
        self.RATE_LIMIT_UPLOAD = get_opt("RATE_LIMIT_UPLOAD", "100/minute")
        # Login endpoint rate limit for brute-force protection (default: 5/minute)
        self.RATE_LIMIT_LOGIN = get_opt("RATE_LIMIT_LOGIN", "10/minute")
        # System instructions endpoint rate limit (default: 10/minute)
        self.RATE_LIMIT_SYS_INS = get_opt("RATE_LIMIT_SYS_INS", "100/minute")
        # Archive cleanup endpoint rate limit (default: 1/hour)
        self.RATE_LIMIT_CLEANUP = get_opt("RATE_LIMIT_CLEANUP", "1/hour")

        # --- API Pagination ---
        # Default number of items returned per page for list endpoints (default: 500)
        self.API_DEFAULT_LIMIT = int(get_opt("API_DEFAULT_LIMIT", 500))
        # Maximum allowed items per page for list endpoints (default: 1000)
        self.API_MAX_LIMIT = int(get_opt("API_MAX_LIMIT", 1000))
        # Default number of activity log entries per page (default: 50)
        self.LOG_DEFAULT_LIMIT = int(get_opt("LOG_DEFAULT_LIMIT", 50))
        # Maximum allowed activity log entries per page (default: 200)
        self.LOG_MAX_LIMIT = int(get_opt("LOG_MAX_LIMIT", 200))

        # --- System Instructions Limits ---
        # Maximum content length for system instructions in characters (default: 1,000,000)
        self.SYS_INS_MAX_CONTENT = int(get_opt("SYS_INS_MAX_CONTENT", 1_000_000))
        # Maximum commit message length for system instructions updates (default: 500)
        self.SYS_INS_MAX_MESSAGE = int(get_opt("SYS_INS_MAX_MESSAGE", 500))

    def verify_password(self, password: str) -> bool:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return secrets.compare_digest(password_hash, self._admin_password_hash)
    
    def get_embedding_api_key(self) -> str:
        """Get next API key for embedding requests using round-robin."""
        key = self.GEMINI_API_KEYS[self._embedding_key_index]
        self._embedding_key_index = (self._embedding_key_index + 1) % len(self.GEMINI_API_KEYS)
        return key
    
    def get_ocr_api_key(self) -> str:
        """Get next API key for OCR requests using round-robin."""
        key = self.GEMINI_API_KEYS[self._ocr_key_index]
        self._ocr_key_index = (self._ocr_key_index + 1) % len(self.GEMINI_API_KEYS)
        return key

# Initialize Settings
try:
    settings = Settings()
except Exception as e:
    print(f"[ERROR] Configuration Load Failed: {e}")
    exit(1)

# Configure Logging
class SanitizingFormatter(logging.Formatter):
    SENSITIVE_PATTERNS = [
        (re.compile(r'(Bearer\s+)[^\s]+', re.I), r'\1[REDACTED]'),
        (re.compile(r'(token["\']?\s*[:=]\s*["\']? )[^"\'\s]+', re.I), r'\1[REDACTED]'),
        (re.compile(r'(password["\']?\s*[:=]\s*["\']?)[^"\'\s]+', re.I), r'\1[REDACTED]'),
    ]
    def format(self, record):
        message = super().format(record)
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            message = pattern.sub(replacement, message)
        return message

handler = logging.StreamHandler()
handler.setFormatter(SanitizingFormatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO), handlers=[handler])
logger = logging.getLogger("admin-backend")
