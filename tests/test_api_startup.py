"""The API imports the shipped NASA cache when it starts (WP24)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from pollination import api
from pollination.config import Settings
from pollination.nasa.cache import get_or_fetch
from pollination.nasa.cache_share import export_cache


def settings(tmp_path: Path) -> Settings:
    return Settings(data_dir=tmp_path / "data", cache_dir=tmp_path / "cache")


def test_startup_fills_the_cache_from_the_shipped_zip(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    get_or_fetch("smap", {"n": 1}, lambda: {"value": 1}, tmp_path / "source")
    export_cache(tmp_path / "source", tmp_path / "data" / api.SHIPPED_CACHE)
    monkeypatch.setattr(api, "Settings", lambda: settings(tmp_path))

    with TestClient(api.app):  # runs the startup hook
        pass

    assert len(list((tmp_path / "cache" / "smap").glob("*.json"))) == 1


def test_startup_survives_no_zip_and_a_broken_zip(tmp_path: Path) -> None:
    api.import_shipped_cache(settings(tmp_path))  # no zip: nothing to do
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / api.SHIPPED_CACHE).write_bytes(b"not a zip")
    api.import_shipped_cache(settings(tmp_path))  # logged, not raised
    assert not (tmp_path / "cache").exists()
