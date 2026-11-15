"""FastAPI entry point for the pollination service."""

import logging
import zipfile
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pollination.config import Settings
from pollination.contract import prefetch_latest_season, router
from pollination.nasa.cache_share import import_cache

log = logging.getLogger(__name__)
SHIPPED_CACHE = "nasa-cache.zip"


def import_shipped_cache(settings: Settings) -> None:
    """Fill the NASA cache from the zip shipped in ``data/``, if there is one.

    A fresh clone or container then shows the demo seasons without an Earthdata
    token. Entries already in the cache are kept, and a bad zip is only logged.
    """
    archive = settings.data_dir / SHIPPED_CACHE
    if not archive.is_file():
        return
    try:
        counts = import_cache(archive, settings.cache_dir)
    except (OSError, ValueError, zipfile.BadZipFile) as exc:  # start with a cold cache
        log.warning("Shipped NASA cache not imported: %s", exc)
        return
    log.info("Shipped NASA cache: %s", counts)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    """Import the shipped NASA cache, then prefetch the latest season if possible."""
    import_shipped_cache(Settings())
    prefetch_latest_season()
    yield


app = FastAPI(title="Pollination API", lifespan=lifespan)
# The Vite dev server may call the API directly; in Docker nginx proxies /api.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
    """Report that the service is running."""
    return {"status": "ok"}
