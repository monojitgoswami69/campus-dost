"""
Interface for handoff provider.

Defines the contract for human handoff operations.
"""
from abc import ABC, abstractmethod
from typing import List, Optional


class HandoffProviderInterface(ABC):
    """Abstract base class for handoff providers."""
    
    @abstractmethod
    async def get_handoffs(
        self, 
        org_id: str, 
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        """
        Get handoff requests for an organization.
        
        Args:
            org_id: Organization ID for multi-tenancy
            status: Filter by status ("pending", "answered", "dismissed")
            limit: Maximum number of results
            
        Returns:
            List of handoff request dictionaries
        """
        pass
    
    @abstractmethod
    async def get_handoff(self, org_id: str, handoff_id: str) -> Optional[dict]:
        """
        Get a specific handoff request.
        
        Args:
            org_id: Organization ID for security check
            handoff_id: Handoff request ID
            
        Returns:
            Handoff request dictionary or None if not found
        """
        pass
    
    @abstractmethod
    async def answer_handoff(
        self,
        org_id: str,
        handoff_id: str,
        answer: str,
        answered_by: str,
    ) -> bool:
        """
        Answer a handoff request.
        
        Args:
            org_id: Organization ID for security check
            handoff_id: Handoff request ID
            answer: Human-provided answer
            answered_by: Admin username who answered
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def dismiss_handoff(
        self,
        org_id: str,
        handoff_id: str,
        dismissed_by: str,
    ) -> bool:
        """
        Dismiss a handoff request without answering.
        
        Args:
            org_id: Organization ID for security check
            handoff_id: Handoff request ID
            dismissed_by: Admin username who dismissed
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_handoff_stats(self, org_id: str) -> dict:
        """
        Get handoff statistics for an organization.
        
        Args:
            org_id: Organization ID
            
        Returns:
            Dictionary with counts: total, pending, answered, dismissed
        """
        pass
