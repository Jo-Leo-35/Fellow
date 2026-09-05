from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import chromadb
from chromadb.errors import ChromaError, NotFoundError

from app.core.config import BACKEND_ROOT, Settings
from app.llm.client import LLMClient
from app.rag.embeddings import (
    LOCAL_EMBEDDING_SIGNATURE,
    deterministic_embeddings,
)

COLLECTIONS = {
    "curriculum": "futureai_curriculum_v1",
    "policy": "futureai_policy_v1",
}
INDEX_BATCH_SIZE = 64


@dataclass(frozen=True, slots=True)
class IndexDocument:
    id: str
    text: str
    metadata: dict[str, str | int | float | bool]


def _read_json(relative_path: str) -> list[dict[str, Any]]:
    path = BACKEND_ROOT / "data" / relative_path
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, list):
        raise TypeError(f"corpus must be a JSON array: {path}")
    return payload


def corpus_documents() -> dict[str, list[IndexDocument]]:
    curriculum = [
        IndexDocument(
            id=item["id"],
            text="\n".join(
                [
                    item["title"],
                    item.get("chapter") or "",
                    item["excerpt"],
                    "關鍵詞：" + "、".join(item.get("keywords") or []),
                ]
            ),
            metadata={
                "corpus": "curriculum",
                "source_type": "curriculum",
                "source_id": item["id"],
                "record_id": item["id"],
                "topic": item["topic"],
                "subject": item["subject"],
                "title": item["title"],
            },
        )
        for item in _read_json("curriculum/materials.json")
    ]
    policies = [
        IndexDocument(
            id=item["id"],
            text="\n".join(
                [
                    item["title"],
                    item["summary"],
                    item["source_excerpt"],
                    "條件："
                    + "；".join(
                        check.get("text", "")
                        for check in item.get("eligibility_checks") or []
                    ),
                    "文件：" + "、".join(item.get("documents") or []),
                    item.get("next_step") or "",
                ]
            ),
            metadata={
                "corpus": "policy",
                "source_type": "policy",
                "source_id": f"policy-source-{item['id']}",
                "record_id": item["id"],
                "program_id": item["id"],
                "category": item["category"],
                "title": item["title"],
            },
        )
        for item in _read_json("policies/programs.json")
    ]
    return {"curriculum": curriculum, "policy": policies}


def embedding_signature(settings: Settings) -> str:
    if settings.runtime_mode == "offline_demo":
        return LOCAL_EMBEDDING_SIGNATURE
    if not settings.embedding_model:
        raise ValueError("EMBEDDING_MODEL is required to build a live index")
    return f"provider:{settings.embedding_model}"


async def _embed(
    settings: Settings,
    texts: Sequence[str],
    llm_client: LLMClient,
) -> list[list[float]]:
    if settings.runtime_mode == "offline_demo":
        return deterministic_embeddings(texts)
    return await llm_client.embed(texts)


def _collection(
    client: chromadb.ClientAPI,
    name: str,
    signature: str,
):
    try:
        existing = client.get_collection(name)
    except NotFoundError:
        existing = None
    if (
        existing is not None
        and existing.metadata.get("embedding_signature") != signature
    ):
        client.delete_collection(name)
        existing = None
    return existing or client.get_or_create_collection(
        name,
        metadata={"hnsw:space": "cosine", "embedding_signature": signature},
    )


async def build_index(
    settings: Settings,
    llm_client: LLMClient | None = None,
) -> dict[str, int]:
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(settings.chroma_path))
    signature = embedding_signature(settings)
    provider = llm_client or LLMClient(settings)
    owns_provider = llm_client is None
    counts: dict[str, int] = {}
    try:
        for corpus, documents in corpus_documents().items():
            collection = _collection(client, COLLECTIONS[corpus], signature)
            wanted_ids = {document.id for document in documents}
            existing_ids = set(collection.get(include=[])["ids"])
            stale_ids = sorted(existing_ids - wanted_ids)
            if stale_ids:
                collection.delete(ids=stale_ids)
            for start in range(0, len(documents), INDEX_BATCH_SIZE):
                batch = documents[start : start + INDEX_BATCH_SIZE]
                embeddings = await _embed(
                    settings,
                    [document.text for document in batch],
                    provider,
                )
                collection.upsert(
                    ids=[document.id for document in batch],
                    embeddings=embeddings,
                    documents=[document.text for document in batch],
                    metadatas=[document.metadata for document in batch],
                )
            counts[corpus] = collection.count()
        return counts
    finally:
        if owns_provider:
            await provider.aclose()


def index_is_ready(settings: Settings) -> bool:
    if not Path(settings.chroma_path).exists():
        return False
    try:
        client = chromadb.PersistentClient(path=str(settings.chroma_path))
        signature = embedding_signature(settings)
        return all(
            client.get_collection(name).count() > 0
            and client.get_collection(name).metadata.get("embedding_signature")
            == signature
            for name in COLLECTIONS.values()
        )
    except (ChromaError, OSError, ValueError):
        return False
