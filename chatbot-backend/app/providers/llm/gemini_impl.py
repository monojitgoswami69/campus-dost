"""
Gemini LLM Provider implementation.

Uses Google's Gemini API for chat completion.
Thread-safe with retry logic for transient failures.
"""
from __future__ import annotations

import asyncio
import threading
from typing import AsyncIterator, List

from google import genai
from google.genai import types

from ...config import settings, get_logger
from ...exceptions import LLMError
from ...utils import is_retryable_error
from .interface import LLMProviderInterface, ChatMessage

logger = get_logger("llm.gemini")


class GeminiLLMProvider(LLMProviderInterface):
    """
    Gemini LLM provider with thread-safe round-robin API key rotation.
    
    Uses Google's genai library for Gemini API access.
    Includes retry logic with exponential backoff for transient failures.
    """
    
    def __init__(self):
        self._clients: List[genai.Client] = []
        self._client_index = 0
        self._lock = threading.Lock()
        self._initialize_clients()
    
    def _initialize_clients(self) -> None:
        """Initialize Gemini clients from configured API keys."""
        if not settings.GEMINI_API_KEYS:
            logger.warning("No Gemini API keys configured")
            return
        
        for key in settings.GEMINI_API_KEYS:
            try:
                client = genai.Client(api_key=key)
                self._clients.append(client)
            except Exception as e:
                logger.error("Failed to init Gemini client for key ...%s: %s", key[-4:], e)
        
        if self._clients:
            logger.info("Initialized %d Gemini client(s)", len(self._clients))
        else:
            logger.warning("No Gemini clients initialized")
    
    def _get_client(self) -> genai.Client:
        """Get next client using thread-safe round-robin."""
        if not self._clients:
            raise LLMError("No Gemini clients available", "API keys not configured")
        
        with self._lock:
            client = self._clients[self._client_index]
            self._client_index = (self._client_index + 1) % len(self._clients)
        return client
    
    async def generate_stream(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.3,
        max_tokens: int = 4096,
        json_mode: bool = False,
    ) -> AsyncIterator[str]:
        """Generate streaming chat completion using Gemini with retry logic.
        
        Args:
            messages: List of ChatMessage objects
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            json_mode: If True, force JSON output format
        """
        # Extract system instruction if present
        system_instruction = None
        chat_messages = []
        
        for msg in messages:
            if msg.role == "system":
                system_instruction = msg.content
            else:
                # Map to Gemini roles (user, model)
                role = "user" if msg.role == "user" else "model"
                chat_messages.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=msg.content)]
                    )
                )
        
        # Build generation config
        config_params = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
            "system_instruction": system_instruction,
        }
        
        # Add JSON mode if requested (Gemini supports this via response_mime_type)
        if json_mode:
            config_params["response_mime_type"] = "application/json"
        
        gen_config = types.GenerateContentConfig(**config_params)
        
        last_error: Exception | None = None
        
        for attempt in range(settings.MAX_RETRIES + 1):
            try:
                client = self._get_client()
                
                # Use async streaming
                response = await asyncio.wait_for(
                    client.aio.models.generate_content_stream(
                        model=settings.GEMINI_MODEL_ID,
                        contents=chat_messages,
                        config=gen_config,
                    ),
                    timeout=settings.CHAT_COMPLETION_TIMEOUT_SECONDS,
                )
                
                async for chunk in response:
                    if chunk.text:
                        yield chunk.text
                
                # Success - exit the retry loop
                return
                        
            except asyncio.TimeoutError as e:
                last_error = e
                logger.warning(
                    "Gemini generation timed out (attempt %d/%d)",
                    attempt + 1,
                    settings.MAX_RETRIES + 1,
                )
                if attempt >= settings.MAX_RETRIES:
                    raise LLMError(
                        "Generation timed out",
                        f"Timeout after {settings.CHAT_COMPLETION_TIMEOUT_SECONDS}s"
                    )
                    
            except Exception as e:
                error_str = str(e).lower()
                
                # Check for rate limit errors
                if "429" in error_str or "rate" in error_str or "quota" in error_str:
                    last_error = e
                    logger.warning(
                        "Gemini rate limit/quota hit (attempt %d/%d): %s",
                        attempt + 1,
                        settings.MAX_RETRIES + 1,
                        e,
                    )
                    if attempt >= settings.MAX_RETRIES:
                        raise LLMError("Rate limit/quota exceeded", str(e))
                        
                # Check for server errors (5xx)
                elif any(f"{code}" in error_str for code in range(500, 600)):
                    last_error = e
                    logger.warning(
                        "Gemini server error (attempt %d/%d): %s",
                        attempt + 1,
                        settings.MAX_RETRIES + 1,
                        e,
                    )
                    if attempt >= settings.MAX_RETRIES:
                        raise LLMError("Server error", str(e))
                        
                # Check for other retryable errors
                elif is_retryable_error(e):
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
                    # Non-retryable error
                    logger.error("Gemini generation failed: %s", e)
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
        """Get the Gemini model identifier."""
        return settings.GEMINI_MODEL_ID
    
    def get_provider_name(self) -> str:
        """Get the provider name."""
        return "gemini"
    
    def is_available(self) -> bool:
        """Check if Gemini provider is available."""
        return len(self._clients) > 0
        return len(self._clients) > 0
