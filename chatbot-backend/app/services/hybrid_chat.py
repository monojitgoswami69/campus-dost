"""
Hybrid Gatekeeper Chat Service.

This module provides chat completion with intelligent handoff decisions.
The LLM always gets called and decides whether it can answer from context
or needs human handoff.

FLOW:
1. Get RAG context (always)
2. Call LLM with structured JSON response format
3. Parse response to get answer + handoff decision
4. If handoff required, store request in Firestore
5. Return response with handoff info

JSON RESPONSE SCHEMA (from LLM):
{
    "answer": "The answer or apology message",
    "handoff_required": true/false,
    "confidence": 0-100
}
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, AsyncIterator, Sequence

from app.config import get_logger, settings
from app.exceptions import LLMError
from app.models import ChatMessage, HandoffDecision
from app.services.rag import RAGResult
from app.providers.handoff import handoff_provider

if TYPE_CHECKING:
    from app.providers.llm.interface import (
        ChatMessage as ProviderChatMessage,
        LLMProviderInterface,
    )

logger = get_logger("services.hybrid_chat")


# =============================================================================
# Handoff System Prompt Template
# =============================================================================

HANDOFF_SYSTEM_PROMPT_TEMPLATE = """You are the official AI assistant for {org_name}. You help students and staff with questions about university services, policies, and facilities.

STRICT RULES:
1. You may ONLY answer questions about {org_name} using the provided context.
2. For questions UNRELATED to the organization (cooking, weather, sports news, programming tutorials, medical advice, etc.), respond with a polite apology and set handoff_required to FALSE.
3. If a question IS about the organization but the context DOES NOT contain sufficient information, you MUST set handoff_required to TRUE and provide a message asking to connect with a human.
4. NEVER hallucinate or invent information not in the context.
5. Keep responses concise and helpful.

RESPONSE FORMAT - You MUST respond with ONLY valid JSON:
{{
    "answer": "Your response here",
    "handoff_required": false,
    "confidence": 85
}}

DECISION LOGIC:
- Question unrelated to organization → answer: "I'm sorry, I can only help with questions about {org_name}.", handoff_required: false, confidence: 90
- Question about organization + context has answer → answer: "actual answer from context", handoff_required: false, confidence: 70-100
- Question about organization + context lacks info → answer: "I don't have enough information to answer this question. Let me connect you with someone who can help.", handoff_required: true, confidence: 0-50

Respond with ONLY the JSON object. No markdown, no code blocks, no extra text."""


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class HybridChatResult:
    """Result from hybrid chat with handoff decision."""
    answer: str
    handoff_required: bool
    handoff_id: str | None
    confidence: int
    raw_llm_response: str
    rag_results: list[RAGResult]
    

def parse_llm_json_response(raw_response: str) -> HandoffDecision:
    """
    Parse JSON response from LLM into HandoffDecision.
    
    Handles various edge cases:
    - Markdown code blocks around JSON
    - Extra whitespace
    - Parse errors (defaults to handoff=True for safety)
    """
    try:
        text = raw_response.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        # Try to find JSON object in the text
        json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
        if json_match:
            text = json_match.group(0)
        
        data = json.loads(text)
        
        return HandoffDecision(
            answer=data.get("answer", ""),
            handoff_required=data.get("handoff_required", True),
            confidence=int(data.get("confidence", 0)),
        )
    except Exception as e:
        logger.warning("Failed to parse LLM JSON response: %s. Raw: %s", e, raw_response[:200])
        # Default to showing the raw response but flagging for review
        return HandoffDecision(
            answer=raw_response if raw_response else "I encountered an error processing your request.",
            handoff_required=False,  # Don't handoff on parse error, just show response
            confidence=50,
        )


class HybridChatService:
    """
    Chat service with hybrid gatekeeper functionality.
    
    Always calls the LLM with RAG context and lets the LLM decide
    whether it can answer or needs to hand off to a human.
    """
    
    def __init__(
        self,
        llm_provider: "LLMProviderInterface",
        org_name: str = "the organization",
    ) -> None:
        self._provider = llm_provider
        self._org_name = org_name
    
    def _build_handoff_system_prompt(self, base_system_instruction: str) -> str:
        """
        Build system prompt with handoff instructions.
        
        Appends JSON response format instructions to the base system instruction.
        """
        # Create the handoff-specific addition
        handoff_addition = f"""

IMPORTANT - RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object in this exact format:
{{
    "answer": "Your response here",
    "handoff_required": false,
    "confidence": 85
}}

HANDOFF RULES:
- If you CAN answer from the provided context → handoff_required: false, confidence: 70-100
- If the question is UNRELATED to {self._org_name} (general knowledge, cooking, weather, etc.) → answer with polite decline, handoff_required: false
- If question IS about {self._org_name} but context LACKS info → handoff_required: true, confidence: 0-50

Respond with ONLY the JSON object. No markdown code blocks, no extra text."""
        
        return base_system_instruction + handoff_addition
    
    def _build_user_prompt(
        self,
        user_message: str,
        rag_results: Sequence[RAGResult],
    ) -> str:
        """Build user prompt with context."""
        context_text = ""
        if rag_results:
            context_parts = []
            for i, result in enumerate(rag_results, 1):
                context_parts.append(f"[Context {i} - Similarity: {result.score:.2f}]\n{result.text}")
            context_text = "\n\n---\n\n".join(context_parts)
        
        if context_text:
            return f"""CONTEXT:
{context_text}

USER QUESTION:
{user_message}

Respond with ONLY valid JSON."""
        else:
            return f"""No context available for this query.

USER QUESTION:
{user_message}

Respond with ONLY valid JSON."""
    
    async def generate_with_handoff(
        self,
        user_message: str,
        rag_results: Sequence[RAGResult],
        history: Sequence[ChatMessage],
        system_instruction: str,
        org_id: str,
        session_id: str | None = None,
    ) -> HybridChatResult:
        """
        Generate response with handoff decision.
        
        Args:
            user_message: User's query
            rag_results: Retrieved RAG context
            history: Conversation history
            system_instruction: Base system instruction
            org_id: Organization ID for multi-tenancy
            session_id: Chat session ID
            
        Returns:
            HybridChatResult with answer and handoff information
        """
        from app.providers.llm.interface import ChatMessage as ProviderMessage
        
        # Build prompts
        system_prompt = self._build_handoff_system_prompt(system_instruction)
        user_prompt = self._build_user_prompt(user_message, rag_results)
        
        # Build message list
        messages: list[ProviderMessage] = [
            ProviderMessage(role="system", content=system_prompt)
        ]
        
        # Add history (simplified - no RAG in historical messages)
        for msg in history:
            role = "user" if msg.role == "user" else "assistant"
            content = "".join(msg.parts)
            messages.append(ProviderMessage(role=role, content=content))
        
        # Add current user prompt
        messages.append(ProviderMessage(role="user", content=user_prompt))
        
        # Generate response (non-streaming for JSON parsing)
        # Use JSON mode for proper structured output from Groq
        raw_response = ""
        try:
            async for chunk in self._provider.generate_stream(
                messages=messages,
                temperature=settings.GENERATION_TEMPERATURE,
                max_tokens=settings.MAX_COMPLETION_TOKENS,
                json_mode=True,  # Force JSON output for reliable parsing
            ):
                raw_response += chunk
        except LLMError as e:
            logger.error("LLM error during hybrid chat: %s", e)
            # Return error response with handoff
            return HybridChatResult(
                answer="I'm having trouble processing your request. Let me connect you with someone who can help.",
                handoff_required=True,
                handoff_id=None,
                confidence=0,
                raw_llm_response="",
                rag_results=list(rag_results),
            )
        
        # Parse LLM response
        decision = parse_llm_json_response(raw_response)
        
        logger.info(
            "Hybrid chat: handoff=%s confidence=%d answer_len=%d",
            decision.handoff_required, decision.confidence, len(decision.answer)
        )
        
        # Create handoff if needed
        handoff_id = None
        if decision.handoff_required:
            # Prepare context chunks for storage
            context_chunks = [
                {
                    "text": r.text,
                    "score": round(r.score, 4),
                    "metadata": r.metadata,
                }
                for r in rag_results
            ]
            
            top_similarity = rag_results[0].score if rag_results else 0.0
            
            handoff_id = await handoff_provider.create_handoff(
                org_id=org_id,
                query=user_message,
                context_chunks=context_chunks,
                similarity_score=top_similarity,
                llm_response=decision.answer,
                confidence=decision.confidence,
                session_id=session_id,
                metadata={
                    "rag_count": len(rag_results),
                    "history_length": len(history),
                },
            )
            
            if handoff_id:
                logger.info("Created handoff request: %s for org=%s", handoff_id, org_id)
        
        return HybridChatResult(
            answer=decision.answer,
            handoff_required=decision.handoff_required,
            handoff_id=handoff_id,
            confidence=decision.confidence,
            raw_llm_response=raw_response,
            rag_results=list(rag_results),
        )
    
    async def generate_stream_with_handoff_check(
        self,
        user_message: str,
        rag_results: Sequence[RAGResult],
        history: Sequence[ChatMessage],
        system_instruction: str,
        org_id: str,
        session_id: str | None = None,
    ) -> AsyncIterator[str]:
        """
        Generate streaming response, creating handoff if needed.
        
        This method:
        1. First generates a complete response to check handoff decision
        2. Yields the answer in chunks for streaming effect
        3. Creates handoff record if needed (async, non-blocking)
        
        Yields:
            Content chunks from the response
        """
        # Get full response with handoff check
        result = await self.generate_with_handoff(
            user_message=user_message,
            rag_results=rag_results,
            history=history,
            system_instruction=system_instruction,
            org_id=org_id,
            session_id=session_id,
        )
        
        # Yield the answer in small chunks for streaming effect
        chunk_size = 10
        answer = result.answer
        for i in range(0, len(answer), chunk_size):
            yield answer[i:i + chunk_size]


# =============================================================================
# Convenience Functions
# =============================================================================

async def generate_hybrid_chat(
    user_message: str,
    rag_results: Sequence[RAGResult],
    history: Sequence[ChatMessage],
    system_instruction: str,
    llm_provider: "LLMProviderInterface",
    org_id: str,
    session_id: str | None = None,
    org_name: str = "the organization",
) -> HybridChatResult:
    """
    Generate chat response with hybrid handoff decision.
    
    Convenience function that creates a HybridChatService and generates response.
    """
    service = HybridChatService(llm_provider, org_name)
    return await service.generate_with_handoff(
        user_message=user_message,
        rag_results=rag_results,
        history=history,
        system_instruction=system_instruction,
        org_id=org_id,
        session_id=session_id,
    )
