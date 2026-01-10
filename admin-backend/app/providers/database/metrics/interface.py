from abc import ABC, abstractmethod
from typing import List

class MetricsProviderInterface(ABC):
    """Abstract interface for metrics storage providers."""
    
    @abstractmethod
    async def get_metrics(self) -> dict:
        """Get dashboard metrics."""
        pass
    
    @abstractmethod
    async def update_metrics(self, updates: dict = None) -> bool:
        """Update dashboard metrics."""
        pass
    
    @abstractmethod
    async def increment_daily_hit(self, date_str: str = None) -> None:
        """Increment hit counter for a specific date."""
        pass
    
    @abstractmethod
    async def get_weekly_metrics(self, days: int = 7) -> List[dict]:
        """Get weekly metrics for the last N days."""
        pass
    
    @abstractmethod
    async def calculate_total_size(self) -> int:
        """Calculate total size of all documents."""
        pass
    
    @abstractmethod
    async def update_total_size(self, size_delta: int = None) -> None:
        """Update total size in metrics."""
        pass
    
    @abstractmethod
    async def backup_system_instructions(self, content: str, backed_up_by: str) -> str:
        """Backup system instructions to history."""
        pass
    
    @abstractmethod
    async def get_system_instructions_history(self, limit: int = 50) -> List[dict]:
        """Get system instructions history."""
        pass
