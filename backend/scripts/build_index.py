from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import Settings
from app.rag.indexer import build_index


async def _main() -> None:
    settings = Settings()
    settings.prepare_directories()
    counts = await build_index(settings)
    print(
        json.dumps(
            {
                "status": "ok",
                "runtime_mode": settings.runtime_mode,
                "chroma_path": str(settings.chroma_path),
                "counts": counts,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    asyncio.run(_main())
