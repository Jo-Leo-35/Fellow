"""Persistent local retrieval for curriculum and policy corpora."""

from app.rag.indexer import build_index
from app.rag.retriever import RetrievalChunk, Retriever

__all__ = ["RetrievalChunk", "Retriever", "build_index"]
