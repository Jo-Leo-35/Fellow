from __future__ import annotations

import math
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request


class SlidingWindowRateLimiter:
    """Small process-local limiter for the single-machine Demo runtime."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, *, limit: int, window_seconds: int) -> int | None:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                return max(1, math.ceil(events[0] + window_seconds - now))
            events.append(now)
            return None


def check_request_rate(
    request: Request,
    *,
    namespace: str,
    subject: str,
    limit: int,
    window_seconds: int,
) -> int | None:
    limiter: SlidingWindowRateLimiter = request.app.state.rate_limiter
    return limiter.check(
        f"{namespace}:{subject}",
        limit=limit,
        window_seconds=window_seconds,
    )
