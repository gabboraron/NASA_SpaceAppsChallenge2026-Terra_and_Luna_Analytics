"""Tests for exporting and importing the NASA cache as a zip."""

import json
import zipfile
from pathlib import Path

import pytest

from pollination.nasa.cache import get_or_fetch
from pollination.nasa.cache_share import export_cache, import_cache


def fill(cache_dir: Path) -> None:
    """Create real cache entries in three namespaces and a dev-only one."""
    for namespace in ("hls", "smap", "power", "osm"):
        for n in range(2):
            get_or_fetch(namespace, {"n": n}, lambda n=n: {"value": n}, cache_dir)


def test_export_then_import_round_trip(tmp_path: Path) -> None:
    """Exported entries land in a fresh cache and are served without refetching."""
    source, target, archive = tmp_path / "a", tmp_path / "b", tmp_path / "x.zip"
    fill(source)
    manifest = export_cache(source, archive)
    assert manifest["namespaces"] == {"hls": 2, "power": 2, "smap": 2}
    assert manifest["total"] == 6  # osm is dev-only, left out
    result = import_cache(archive, target)
    assert result == {"imported": 6, "skipped": 0}
    calls: list[int] = []
    value = get_or_fetch("smap", {"n": 1}, lambda: calls.append(1) or {}, target)
    assert value == {"value": 1}
    assert not calls


def test_import_is_idempotent_and_never_overwrites(tmp_path: Path) -> None:
    """A second import skips existing files; local entries are not replaced."""
    source, target, archive = tmp_path / "a", tmp_path / "b", tmp_path / "x.zip"
    fill(source)
    export_cache(source, archive)
    import_cache(archive, target)
    mine = next((target / "hls").glob("*.json"))
    mine.write_text(json.dumps({"fetched_at": 1, "payload": {"mine": True}}))
    assert import_cache(archive, target) == {"imported": 0, "skipped": 6}
    assert json.loads(mine.read_text())["payload"] == {"mine": True}


@pytest.mark.parametrize(
    "member",
    [
        "../evil.json",  # path traversal
        "hls/../../evil.json",
        "/abs/evil.json",
        "osm/" + "a" * 64 + ".json",  # namespace not shared
        "hls/notahash.json",
        "hls/" + "a" * 64 + ".exe",
    ],
)
def test_import_rejects_unsafe_members(tmp_path: Path, member: str) -> None:
    """Anything that is not ``<namespace>/<sha256>.json`` aborts before writing."""
    archive = tmp_path / "bad.zip"
    with zipfile.ZipFile(archive, "w") as z:
        z.writestr(member, json.dumps({"fetched_at": 1, "payload": {}}))
    with pytest.raises(ValueError, match="Unexpected member"):
        import_cache(archive, tmp_path / "cache")
    assert not (tmp_path / "evil.json").exists()
    assert not (tmp_path / "cache").exists()


def test_import_rejects_corrupt_entries(tmp_path: Path) -> None:
    """A member that is not a cache entry aborts the whole import."""
    archive = tmp_path / "bad.zip"
    with zipfile.ZipFile(archive, "w") as z:
        z.writestr("hls/" + "a" * 64 + ".json", "not json")
    with pytest.raises(ValueError, match="Not a cache entry"):
        import_cache(archive, tmp_path / "cache")


def test_export_of_an_empty_cache_is_an_error(tmp_path: Path) -> None:
    """Exporting nothing is a mistake worth failing on."""
    with pytest.raises(ValueError, match="No cache entries"):
        export_cache(tmp_path / "empty", tmp_path / "x.zip")
