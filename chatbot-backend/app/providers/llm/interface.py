"""
Abstract interface for LLM chat completion providers.

All LLM providers must implement this interface to ensure
consistent behavior and easy hot-swapping.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator, List


@dataclass
class ChatMessage:
    """Represents a single message in a conversation."""
    role: str  # "system", "user", "assistant"
    content: str


class LLMProviderInterface(ABC):
    """
    Abstract interface for LLM chat completion providers.
    
    All implementations must provide:
    - Streaming chat completion
    - Non-streaming chat completion (optional, can be built from streaming)
    - Model information
    """
    
    @abstractmethod
    async def generate_stream(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.3,
        max_tokens: int = 4096,
        json_mode: bool = False,
    ) -> AsyncIterator[str]:
        """
        Generate a streaming chat completion.
        
        Args:
            messages: List of ChatMessage objects (system, user, assistant)
            temperature: Generation temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
            json_mode: If True, force JSON output format (provider-dependent)
            
        Yields:
            str: Content chunks as they are generated
            
        Raises:
            LLMError: On generation failure
        """
        pass
    
    async def generate(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.3,
        max_tokens: int = 4096,
        json_mode: bool = False,
    ) -> str:
        """
        Generate a non-streaming chat completion.
        
        Default implementation collects streaming output.
        Override for providers with native non-streaming support.
        
        Args:
            messages: List of ChatMessage objects
            temperature: Generation temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
            json_mode: If True, force JSON output format (provider-dependent)
            
        Returns:
            str: Complete generated response
            
        Raises:
            LLMError: On generation failure
        """
        chunks = []
        async for chunk in self.generate_stream(messages, temperature, max_tokens, json_mode):
            chunks.append(chunk)
        return "".join(chunks)
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Get the model identifier."""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name (e.g., 'groq', 'gemini')."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is available (has valid API keys)."""
        pass
