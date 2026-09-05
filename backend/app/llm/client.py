from __future__ import annotations

import asyncio
import math
from collections.abc import Sequence
from typing import Any, Self, TypeVar

import openai
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import Settings

StructuredModel = TypeVar("StructuredModel", bound=BaseModel)


class LLMClientError(RuntimeError):
    """A sanitized provider boundary error safe for service-level classification."""


class LLMConfigurationError(LLMClientError):
    pass


class LLMTimeoutError(LLMClientError):
    pass


class LLMUnavailableError(LLMClientError):
    pass


class LLMProviderError(LLMClientError):
    pass


class LLMClient:
    """Only module allowed to call the OpenAI-compatible SDK.

    The official SDK's Chat Completions parsing helper turns a Pydantic model
    into a JSON Schema response format and parses the returned content.  Chat
    Completions is used here because it remains the broadest OpenAI-compatible
    surface while supporting both structured output and image content parts.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: AsyncOpenAI | None = None

    def _configured_client(self) -> AsyncOpenAI:
        if self._settings.runtime_mode != "live":
            raise LLMConfigurationError("provider calls are disabled in offline_demo")
        if self._settings.llm_api_key is None:
            raise LLMConfigurationError("LLM_API_KEY is required in live mode")
        if not self._settings.llm_model:
            raise LLMConfigurationError("LLM_MODEL is required in live mode")
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self._settings.llm_api_key.get_secret_value(),
                base_url=self._settings.llm_base_url,
                timeout=self._settings.agent_deadline_seconds,
                max_retries=0,
            )
        return self._client

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *_exc_info: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        client = self._client
        if client is None or client.is_closed():
            return
        close_task = asyncio.create_task(client.close())
        try:
            await asyncio.shield(close_task)
        except asyncio.CancelledError:
            await close_task
            raise
        finally:
            self._client = None

    async def generate(
        self,
        messages: Sequence[dict[str, Any]],
        response_schema: type[StructuredModel],
    ) -> StructuredModel:
        client = self._configured_client()
        try:
            completion = await client.chat.completions.parse(
                model=self._settings.llm_model or "",
                messages=list(messages),  # type: ignore[arg-type]
                response_format=response_schema,
            )
            if not completion.choices:
                raise LLMProviderError("provider returned no choices")
            message = completion.choices[0].message
            if message.refusal:
                raise LLMProviderError("provider refused the structured request")
            if message.parsed is None:
                raise LLMProviderError("provider returned no parsed payload")
            return message.parsed
        except LLMClientError:
            raise
        except openai.APITimeoutError as exc:
            raise LLMTimeoutError("provider request timed out") from exc
        except openai.APIConnectionError as exc:
            raise LLMUnavailableError("provider connection failed") from exc
        except openai.APIStatusError as exc:
            if exc.status_code >= 500 or exc.status_code == 429:
                raise LLMUnavailableError("provider is unavailable") from exc
            raise LLMProviderError("provider rejected the request") from exc
        except Exception as exc:
            raise LLMProviderError("provider response failed validation") from exc

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        if not self._settings.embedding_model:
            raise LLMConfigurationError("EMBEDDING_MODEL is required in live mode")
        client = self._configured_client()
        try:
            response = await client.embeddings.create(
                model=self._settings.embedding_model,
                input=list(texts),
                encoding_format="float",
            )
            ordered = sorted(response.data, key=lambda item: item.index)
            vectors = [[float(value) for value in item.embedding] for item in ordered]
            if len(vectors) != len(texts) or not vectors or not vectors[0]:
                raise LLMProviderError("provider returned incomplete embeddings")
            dimension = len(vectors[0])
            if any(
                len(vector) != dimension
                or any(not math.isfinite(value) for value in vector)
                for vector in vectors
            ):
                raise LLMProviderError("provider returned invalid embeddings")
            return vectors
        except LLMClientError:
            raise
        except openai.APITimeoutError as exc:
            raise LLMTimeoutError("embedding request timed out") from exc
        except openai.APIConnectionError as exc:
            raise LLMUnavailableError("embedding provider connection failed") from exc
        except openai.APIStatusError as exc:
            if exc.status_code >= 500 or exc.status_code == 429:
                raise LLMUnavailableError("embedding provider is unavailable") from exc
            raise LLMProviderError("embedding provider rejected the request") from exc
        except Exception as exc:
            raise LLMProviderError("embedding response failed validation") from exc
