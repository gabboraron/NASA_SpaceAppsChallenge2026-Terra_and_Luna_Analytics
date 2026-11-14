"""Disk cache for NASA API responses (stdlib only)."""

import hashlib
import json
import os
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from pollination.config import Settings

FETCHED_AT = "fetched_at"
PAYLOAD = "payload"


def _hash_key(key_parts: dict[str, Any]) -> str:
    """Return the sha256 of the canonical JSON form of ``key_parts``."""
    canonical = json.dumps(key_parts, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _read(path: Path) -> dict[str, Any] | None:
    """Return the cached payload, or None if missing or corrupted."""
    try:
        entry = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(entry, dict) or PAYLOAD not in entry:
        return None
    payload: Any = entry[PAYLOAD]  # pyright: ignore[reportUnknownVariableType]
    return payload if isinstance(payload, dict) else None  # pyright: ignore[reportUnknownVariableType]


def get_or_fetch(
    namespace: str,
    key_parts: dict[str, Any],
    fetch_fn: Callable[[], dict[str, Any]],
    cache_dir: Path | None = None,
) -> dict[str, Any]:
    """Return a cached response, calling ``fetch_fn`` only on a miss.

    Entries live at ``<cache_dir>/<namespace>/<sha256>.json`` together with the
    fetch timestamp. Unreadable or corrupted entries are refetched.

    Args:
        namespace: Sub-directory grouping, e.g. ``"power"``.
        key_parts: JSON-serialisable values identifying the request.
        fetch_fn: Zero-argument callable producing the JSON-serialisable response.
        cache_dir: Cache root; defaults to ``Settings().cache_dir``.

    Returns:
        The response dict, from cache or freshly fetched.
    """
    root = cache_dir if cache_dir is not None else Settings().cache_dir
    path = root / namespace / f"{_hash_key(key_parts)}.json"
    cached = _read(path)
    if cached is not None:
        return cached

    payload = fetch_fn()
    path.parent.mkdir(parents=True, exist_ok=True)
    entry = {FETCHED_AT: time.time(), PAYLOAD: payload}
    write_atomic(path, json.dumps(entry).encode())
    return payload


def write_atomic(path: Path, data: bytes) -> None:
    """Write a file so a crash never leaves a half-written entry."""
    fd, tmp_name = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as tmp:
            tmp.write(data)
        Path(tmp_name).replace(path)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise
