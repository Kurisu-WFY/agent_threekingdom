import hashlib
import math
from collections import Counter

try:
    from .tokenizer import tokenize
except ImportError:
    from tokenizer import tokenize


class HashEmbeddingModel:
    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def embed(self, text: str) -> list[float]:
        counts = Counter(tokenize(text))
        vec = [0.0] * self.dimension
        for token, count in counts.items():
            digest = hashlib.md5(token.encode("utf-8")).hexdigest()
            index = int(digest[:8], 16) % self.dimension
            sign = 1 if int(digest[8:10], 16) % 2 == 0 else -1
            vec[index] += sign * count
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    return sum(x * y for x, y in zip(a, b))
