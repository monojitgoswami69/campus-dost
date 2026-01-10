import re
import unicodedata
from collections import Counter
from typing import List
from ..config import settings

class TextCleaner:
    def clean_text(self, text: str) -> str:
        text = unicodedata.normalize("NFKC", text)
        text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch in "\n\t")
        text = re.sub(r"^\s*Page\s+\d+\s*$", "", text, flags=re.MULTILINE | re.IGNORECASE)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        lines = text.split('\n')
        merged = []
        for line in lines:
            line = line.strip()
            if not line:
                merged.append("")
                continue
            if merged and merged[-1] and not merged[-1].endswith(('. ', '?', '! ', ':')):
                merged[-1] += " " + line
            else:
                merged.append(line)
        final_lines = [l for l in merged if l.strip()]
        if final_lines:
            counts = Counter(final_lines)
            threshold = max(5, len(final_lines) * 0.05)
            filtered_lines = []
            for line in final_lines:
                if len(line) < 100 and counts[line] > threshold:
                    continue
                filtered_lines.append(line)
            text = "\n\n".join(filtered_lines)
        else:
            text = "\n\n".join(merged)
        return text.strip()

class SemanticChunker:
    def __init__(self):
        self.ATOMIC_SIZE = settings.SEMANTIC_ATOMIC_SIZE
        self.SIMILARITY_THRESHOLD = settings.SEMANTIC_SIMILARITY_THRESHOLD
        self.MAX_CHUNK_SIZE = settings.SEMANTIC_MAX_CHUNK_SIZE

    def _split_into_sentences(self, text: str) -> List[str]:
        return re.split(r'(?<=[.?!])\s+', text)

    def _create_atoms(self, text: str) -> List[str]:
        """Atomic splitting logic: Small blocks (~500 chars)"""
        sentences = self._split_into_sentences(text)
        atoms = []
        current_atom = []
        current_len = 0
        for sentence in sentences:
            sent_len = len(sentence)
            if current_len + sent_len > self.ATOMIC_SIZE:
                if current_atom:
                    atoms.append(" ".join(current_atom))
                current_atom = [sentence]
                current_len = sent_len
            else:
                current_atom.append(sentence)
                current_len += sent_len
        if current_atom:
            atoms.append(" ".join(current_atom))
        return atoms

    async def chunk_text(self, text: str, embedding_service, **kwargs) -> List[str]:
        # 1. Create Atoms
        atoms = self._create_atoms(text)
        if not atoms:
            return []

        # 2. Vector Probe
        # Note: EmbeddingService.generate_embeddings_batch is batched by asyncio.gather, 
        # but for true speedup with Gemini, we should use the API's native batching 
        # or just rely on the concurrency. 
        # For this implementation, we rely on the EmbeddingService's logic.
        atom_vectors = await embedding_service.generate_embeddings_batch(atoms)

        # 3. Hierarchical Merge
        final_chunks = []
        current_buffer = [atoms[0]]
        current_len = len(atoms[0])
        
        for i in range(1, len(atoms)):
            if i >= len(atom_vectors) or i-1 >= len(atom_vectors):
                break

            # Calculate Cosine Similarity
            vec_a = atom_vectors[i]
            vec_b = atom_vectors[i-1]
            dot = sum(a*b for a, b in zip(vec_a, vec_b))
            
            # Decision Logic
            is_related = dot > self.SIMILARITY_THRESHOLD
            fits_size = (current_len + len(atoms[i])) <= self.MAX_CHUNK_SIZE
            
            if is_related and fits_size:
                current_buffer.append(atoms[i])
                current_len += len(atoms[i])
            else:
                final_chunks.append(" ".join(current_buffer))
                current_buffer = [atoms[i]]
                current_len = len(atoms[i])
                
        if current_buffer:
            final_chunks.append(" ".join(current_buffer))
            
        return final_chunks
