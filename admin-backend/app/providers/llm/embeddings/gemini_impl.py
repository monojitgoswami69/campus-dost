import asyncio
from typing import List, Tuple
from google import genai
from ....config import settings, logger
from ....exceptions import EmbeddingError
from .interface import EmbeddingProviderInterface

class GeminiEmbeddingProvider(EmbeddingProviderInterface):
    """Gemini-based embedding generation with batching and round-robin API key rotation."""
    
    def __init__(self):
        self.model = settings.GEMINI_EMBEDDING_MODEL
        self.dims = settings.EMBEDDING_DIMENSIONS
        self._semaphore = asyncio.Semaphore(settings.EMBEDDING_CONCURRENCY)
        self.batch_size = settings.EMBEDDING_BATCH_SIZE

    def _get_client(self):
        """Create a new client with next API key in round-robin."""
        api_key = settings.get_embedding_api_key()
        if not api_key:
            raise EmbeddingError("Gemini API key not configured")
        return genai.Client(api_key=api_key)

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings using batched API calls for efficiency.
        
        Raises:
            EmbeddingError: If ANY batch fails to generate embeddings.
                           This prevents silent failures where files appear
                           uploaded successfully but have no/partial embeddings.
        """
        if not texts:
            return []
        
        # Preprocess texts
        processed_texts = [t.replace("\n", " ").strip()[:settings.EMBEDDING_TEXT_LIMIT] for t in texts]
        
        # Split into batches
        batches = [processed_texts[i:i + self.batch_size] for i in range(0, len(processed_texts), self.batch_size)]
        
        # Track errors across batches
        batch_errors: List[Tuple[int, str]] = []
        
        async def _embed_batch(batch_texts: List[str], batch_start_idx: int) -> List[Tuple[int, List[float], str | None]]:
            """Embed a batch of texts in a single API call. Returns (index, embedding, error)."""
            async with self._semaphore:
                try:
                    # Get a fresh client with rotated API key for each batch
                    client = self._get_client()
                    # Gemini API accepts a list of texts for batch processing
                    res = await client.aio.models.embed_content(
                        model=self.model,
                        contents=batch_texts,
                        config={'output_dimensionality': self.dims}
                    )
                    # Extract embeddings and pair with original indices (no error)
                    return [(batch_start_idx + i, list(emb.values), None) for i, emb in enumerate(res.embeddings)]
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Batch embed error for indices {batch_start_idx}-{batch_start_idx + len(batch_texts)}: {e}")
                    # Return error info instead of silently returning zero vectors
                    return [(batch_start_idx + i, None, error_msg) for i in range(len(batch_texts))]
        
        # Process all batches concurrently
        batch_tasks = [_embed_batch(batch, i * self.batch_size) for i, batch in enumerate(batches)]
        batch_results = await asyncio.gather(*batch_tasks)
        
        # Flatten results and check for errors
        all_results = [item for batch_result in batch_results for item in batch_result]
        
        # Collect all errors
        failed_indices = []
        error_messages = set()
        for idx, embedding, error in all_results:
            if error is not None:
                failed_indices.append(idx)
                error_messages.add(error)
        
        # If ANY batch failed, raise an error - don't silently continue with partial embeddings
        if failed_indices:
            error_summary = "; ".join(error_messages)
            raise EmbeddingError(
                f"Embedding generation failed for {len(failed_indices)}/{len(texts)} chunks. "
                f"Errors: {error_summary}"
            )
        
        # Sort results by index to maintain input order
        sorted_results = sorted(all_results, key=lambda x: x[0])
        return [r[1] for r in sorted_results]

    def get_dimensions(self) -> int:
        return self.dims

    def get_model_name(self) -> str:
        return self.model
