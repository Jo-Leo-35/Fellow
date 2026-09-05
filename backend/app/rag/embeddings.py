from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from collections.abc import Sequence

LOCAL_EMBEDDING_DIMENSION = 384
LOCAL_EMBEDDING_SIGNATURE = "futureai-local-hash-v1-384"


def _tokens(text: str) -> set[str]:
    normalized = unicodedata.normalize("NFKC", text).casefold()
    compact = "".join(normalized.split())
    tokens = set(re.findall(r"[a-z0-9]+|[\u3400-\u9fff]", normalized))
    for size in (2, 3):
        tokens.update(
            compact[index : index + size]
            for index in range(max(len(compact) - size + 1, 0))
        )
    return tokens or {"<empty>"}


def deterministic_embeddings(texts: Sequence[str]) -> list[list[float]]:
    """Small reproducible feature-hash embeddings; no model download required."""

    vectors: list[list[float]] = []
    for text in texts:
        vector = [0.0] * LOCAL_EMBEDDING_DIMENSION
        for token in _tokens(text):
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % LOCAL_EMBEDDING_DIMENSION
            sign = 1.0 if digest[4] & 1 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        vectors.append([value / norm for value in vector])
    return vectors
