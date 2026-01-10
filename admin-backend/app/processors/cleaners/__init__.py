import re
import unicodedata
from collections import Counter
from .interface import CleanerInterface

class UnicodeTextCleaner(CleanerInterface):
    """Unicode-aware text cleaning and normalization."""
    
    def clean(self, text: str) -> str:
        # Unicode normalization
        text = unicodedata.normalize("NFKC", text)
        
        # Remove control characters except newline and tab
        text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch in "\n\t")
        
        # Remove page numbers
        text = re.sub(r"^\s*Page\s+\d+\s*$", "", text, flags=re.MULTILINE | re.IGNORECASE)
        
        # Normalize whitespace
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        
        # Merge broken sentences
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
        
        # Filter repetitive lines (headers/footers)
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

# Generic singleton
text_cleaner = UnicodeTextCleaner()

__all__ = ['text_cleaner', 'CleanerInterface']
