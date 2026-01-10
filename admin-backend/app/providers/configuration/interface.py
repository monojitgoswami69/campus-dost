from abc import ABC, abstractmethod
from typing import List

class ConfigProviderInterface(ABC):
    """Abstract interface for system configuration storage providers."""
    
    @abstractmethod
    async def get_instructions(self) -> dict:
        """Get system instructions.
        
        Returns:
            dict with keys: content, commit (optional)
        """
        pass
    
    @abstractmethod
    async def save_instructions(self, content: str, message: str) -> dict:
        """Save system instructions.
        
        Returns:
            dict with keys: commit (optional), success
        """
        pass
