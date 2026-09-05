from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

import chromadb

from app.core.config import Settings
from app.llm.client import LLMClient
from app.rag.embeddings import deterministic_embeddings
from app.rag.indexer import COLLECTIONS, embedding_signature

TOP_K = 5


class RetrievalUnavailableError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class RetrievalChunk:
    chunk_id: str
    source_id: str
    record_id: str
    text: str
    score: float
    metadata: dict[str, Any]


class Retriever:
    def __init__(self, settings: Settings, llm_client: LLMClient | None = None) -> None:
        self._settings = settings
        self._llm_client = llm_client

    async def search(
        self,
        corpus: Literal["curriculum", "policy"],
        query: str,
        *,
        where: dict[str, str] | None = None,
    ) -> list[RetrievalChunk]:
        try:
            client = chromadb.PersistentClient(path=str(self._settings.chroma_path))
            collection = client.get_collection(COLLECTIONS[corpus])
            signature = embedding_signature(self._settings)
            if collection.metadata.get("embedding_signature") != signature:
                raise RetrievalUnavailableError("index embedding signature is stale")
            if collection.count() == 0:
                raise RetrievalUnavailableError("index is empty")
            if self._settings.runtime_mode == "offline_demo":
                query_embedding = deterministic_embeddings([query])[0]
            elif self._llm_client is not None:
                query_embedding = (await self._llm_client.embed([query]))[0]
            else:
                async with LLMClient(self._settings) as provider:
                    query_embedding = (await provider.embed([query]))[0]
            result = collection.query(
                query_embeddings=[query_embedding],
                n_results=TOP_K,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
        except RetrievalUnavailableError:
            raise
        except Exception as exc:
            raise RetrievalUnavailableError(
                "persistent retrieval index is unavailable"
            ) from exc

        ids = result.get("ids", [[]])[0]
        documents = result.get("documents", [[]])[0] or []
        metadatas = result.get("metadatas", [[]])[0] or []
        distances = result.get("distances", [[]])[0] or []
        chunks: list[RetrievalChunk] = []
        for chunk_id, document, metadata, distance in zip(
            ids, documents, metadatas, distances, strict=True
        ):
            if not isinstance(metadata, dict):
                continue
            chunks.append(
                RetrievalChunk(
                    chunk_id=str(chunk_id),
                    source_id=str(metadata["source_id"]),
                    record_id=str(metadata["record_id"]),
                    text=str(document),
                    score=max(0.0, 1.0 - float(distance)),
                    metadata=dict(metadata),
                )
            )
        return chunks
