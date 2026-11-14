"""Foundation checks for the pollination backend."""

import asyncio
from pathlib import Path

import httpx
import pytest

from pollination.api import app
from pollination.config import Settings


def test_health_without_credentials(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.chdir(tmp_path)
    for key in ("EARTHDATA_USERNAME", "EARTHDATA_PASSWORD", "EARTHDATA_TOKEN"):
        monkeypatch.delenv(key, raising=False)
    assert Settings().earthdata_token is None

    async def request_health() -> httpx.Response:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.get("/health")

    response = asyncio.run(request_health())
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_config_overrides(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("CACHE_DIR", str(tmp_path))
    monkeypatch.setenv("BBOX", "[21,47,23,49]")
    settings = Settings()
    assert settings.cache_dir == tmp_path
    assert settings.bbox == (21, 47, 23, 49)
