from typing import Optional, Any

class AppException(Exception):
    def __init__(self, message: str, status_code: int = 500, details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details

class AuthenticationError(AppException):
    def __init__(self, message: str = "Authentication failed", details: Optional[Any] = None):
        super().__init__(message, status_code=401, details=details)

class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(message, status_code=404, details=details)

class FileExtractionError(AppException):
    def __init__(self, message: str = "Failed to extract text", details: Optional[Any] = None):
        super().__init__(message, status_code=422, details=details)

class UnsupportedFileTypeError(AppException):
    def __init__(self, message: str = "Unsupported file type", details: Optional[Any] = None):
        super().__init__(message, status_code=415, details=details)

class FileSizeError(AppException):
    def __init__(self, message: str = "File too large", details: Optional[Any] = None):
        super().__init__(message, status_code=413, details=details)

class TextProcessingError(AppException):
    def __init__(self, message: str = "Text processing failed", details: Optional[Any] = None):
        super().__init__(message, status_code=422, details=details)

class EmbeddingError(AppException):
    def __init__(self, message: str = "Embedding generation failed", details: Optional[Any] = None):
        super().__init__(message, status_code=503, details=details)  # 503 = Service Unavailable (embedding API failed)

class GitHubError(AppException):
    def __init__(self, message: str = "GitHub operation failed", details: Optional[Any] = None):
        super().__init__(message, status_code=502, details=details)
