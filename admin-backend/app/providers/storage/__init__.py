"""Generic storage provider - implementation selected by configuration."""
from ...config import settings
from .interface import StorageProviderInterface

# Factory pattern - select implementation based on configuration
STORAGE_PROVIDER = getattr(settings, 'STORAGE_PROVIDER', 'dropbox').lower()

if STORAGE_PROVIDER == 'dropbox':
    from .dropbox_impl import DropboxStorageProvider
    storage_provider: StorageProviderInterface = DropboxStorageProvider()
elif STORAGE_PROVIDER == 'github':
    from .github_impl import GitHubStorageProvider
    storage_provider: StorageProviderInterface = GitHubStorageProvider()
else:
    raise ValueError(f"Unknown storage provider: {STORAGE_PROVIDER}")

__all__ = ['storage_provider', 'StorageProviderInterface']
