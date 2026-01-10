from abc import ABC, abstractmethod

class CleanerInterface(ABC):
    """Abstract interface for text cleaners."""
    
    @abstractmethod
    def clean(self, text: str) -> str:
        """Clean and normalize text."""
        pass
