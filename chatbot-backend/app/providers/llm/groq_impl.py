"""
Groq LLM Provider implementation.

Uses Groq's OpenAI-compatible API for fast inference.
Thread-safe with retry logic for transient failures.
"""
from __future__ import annotations

import asyncio
import threading
from typing import AsyncIterator, List

import groq

from ...config import settings, get_logger
from ...exceptions import LLMError
from ...utils import retry_async, is_retryable_error
from .interface import LLMProviderInterface, ChatMessage

logger = get_logger("llm.groq")


class GroqLLMProvider(LLMProviderInterface):
    """
    Groq LLM provider with thread-safe round-robin API key rotation.
    
    Supports multiple API keys for load balancing and failover.
    Includes retry logic with exponential backoff for transient failures.
    """
    
    def __init__(self):
        self._clients: List[groq.AsyncGroq] = []
        self._client_index = 0
        self._lock = threading.Lock()
        self._initialize_clients()
    
    def _initialize_clients(self) -> None:
        """Initialize Groq clients from configured API keys."""
        if not settings.GROQ_API_KEYS:
            logger.warning("No Groq API keys configured")
            return
        
        for key in settings.GROQ_API_KEYS:
            try:
                client = groq.AsyncGroq(api_key=key)
                self._clients.append(client)
            except Exception as e:
                logger.error("Failed to init Groq client for key ...%s: %s", key[-4:], e)
        
        if self._clients:
            logger.info("Initialized %d Groq client(s)", len(self._clients))
        else:
            logger.warning("No Groq clients initialized")
    
    def _get_client(self) -> groq.AsyncGroq:
        """Get next client using thread-safe round-robin."""
        if not self._clients:
            raise LLMError("No Groq clients available", "API keys not configured")
        
        with self._lock:
            client = self._clients[self._client_index]
            self._client_index = (self._client_index + 1) % len(self._clients)
        return client
    
    async def _make_request(
        self,
        messages: List[dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool = False,
    ):
        """Make a single API request (used by retry logic)."""
        client = self._get_client()
        
        # Build request kwargs
        request_kwargs = {
            "model": settings.GROQ_MODEL_ID,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
            "max_tokens": max_tokens,
        }
        
        # Add JSON mode if requested (Groq supports this like OpenAI)
        if json_mode:
            request_kwargs["response_format"] = {"type": "json_object"}
        
        return await asyncio.wait_for(
            client.chat.completions.create(**request_kwargs),
            timeout=settings.CHAT_COMPLETION_TIMEOUT_SECONDS,
        )
    
    async def generate_stream(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.3,
        max_tokens: int = 4096,
        json_mode: bool = False,
    ) -> AsyncIterator[str]:
        """Generate streaming chat completion using Groq with retry logic.
        
        Args:
            messages: List of ChatMessage objects
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            json_mode: If True, force JSON output format
        """
        # Convert to Groq message format
        groq_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        last_error: Exception | None = None
        
        for attempt in range(settings.MAX_RETRIES + 1):
            try:
                stream = await self._make_request(
                    groq_messages,
                    temperature,
                    max_tokens,
                    json_mode,
                )
                
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                
                # Success - exit the retry loop
                return
                        
            except asyncio.TimeoutError as e:
                last_error = e
                logger.warning(
                    "Groq generation timed out (attempt %d/%d)",
                    attempt + 1,
                    settings.MAX_RETRIES + 1,
                )
                if attempt >= settings.MAX_RETRIES:
                    raise LLMError(
                        "Generation timed out",
                        f"Timeout after {settings.CHAT_COMPLETION_TIMEOUT_SECONDS}s"
                    )
                    
            except groq.RateLimitError as e:
                last_error = e
                logger.warning(
                    "Groq rate limit hit (attempt %d/%d): %s",
                    attempt + 1,
                    settings.MAX_RETRIES + 1,
                    e,
                )
                if attempt >= settings.MAX_RETRIES:
                    raise LLMError("Rate limit exceeded", str(e))
                    
            except groq.APIStatusError as e:
                # 5xx errors are retryable
                if e.status_code >= 500:
                    last_error = e
                    logger.warning(
                        "Groq server error %d (attempt %d/%d): %s",
                        e.status_code,
                        attempt + 1,
                        settings.MAX_RETRIES + 1,
                        e,
                    )
                    if attempt >= settings.MAX_RETRIES:
                        raise LLMError(f"Server error {e.status_code}", str(e))
                else:
                    # 4xx errors (except rate limit) are not retryable
                    raise LLMError(f"API error {e.status_code}", str(e))
                    
            except groq.APIError as e:
                logger.error("Groq API error: %s", e)
                raise LLMError("Groq API error", str(e))
                
            except Exception as e:
                if is_retryable_error(e):
                    last_error = e
                    logger.warning(
                        "Retryable error (attempt %d/%d): %s",
                        attempt + 1,
                        settings.MAX_RETRIES + 1,
                        e,
                    )
                    if attempt >= settings.MAX_RETRIES:
                        raise LLMError("Generation failed after retries", str(e))
                else:
                    logger.error("Groq generation failed: %s", e)
                    raise LLMError("Generation failed", str(e))
            
            # Wait before retry with exponential backoff
            if attempt < settings.MAX_RETRIES:
                delay = min(
                    settings.RETRY_BASE_DELAY * (2 ** attempt),
                    settings.RETRY_MAX_DELAY,
                )
                await asyncio.sleep(delay)
        
        # Should not reach here
        raise LLMError("Generation failed", str(last_error) if last_error else "Unknown error")
    
    def get_model_name(self) -> str:
        """Get the Groq model identifier."""
        return settings.GROQ_MODEL_ID
    
    def get_provider_name(self) -> str:
        """Get the provider name."""
        return "groq"
    
    def is_available(self) -> bool:
        """Check if Groq provider is available."""
        return len(self._clients) > 0
