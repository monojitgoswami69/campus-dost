"""Generic configuration provider - implementation selected by configuration."""
from .interface import ConfigProviderInterface
from .github_impl import GitHubConfigProvider

# Factory pattern - only GitHub implementation for now
config_provider: ConfigProviderInterface = GitHubConfigProvider()

__all__ = ['config_provider', 'ConfigProviderInterface']
