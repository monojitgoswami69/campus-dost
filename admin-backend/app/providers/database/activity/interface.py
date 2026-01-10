from abc import ABC, abstractmethod
from typing import List

class ActivityProviderInterface(ABC):
    """Abstract interface for activity logging providers."""
    
    @abstractmethod
    async def log_activity(self, action: str, actor: str, resource_type: str = None,
                          resource_id: str = None, meta: dict = None) -> str:
        """Log an activity event."""
        pass
    
    @abstractmethod
    async def get_activity_log(self, limit: int) -> List[dict]:
        """Get recent activity logs."""
        pass
