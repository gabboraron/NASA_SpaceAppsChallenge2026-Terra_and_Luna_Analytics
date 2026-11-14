"""Share a warmed NASA cache between machines as a zip.

One person runs ``scripts/warm_cache.py`` (tens of minutes); everyone else imports
the zip (seconds). Only the ``hls``, ``power`` and ``smap`` namespaces are shared,
and import accepts nothing but ``<namespace>/<sha256>.json`` entries, so a zip
cannot write outside the cache folder.

Usage::

    uv run python -m pollination.nasa.cache_share export nasa-cache.zip
    uv run python -m pollination.nasa.cache_share import nasa-cache.zip
"""

import argparse
import json
import logging
import re
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pollination.config import Settings
from pollination.nasa.cache import FETCHED_AT, PAYLOAD, write_atomic

SHARED = ("hls", "power", "smap")
MANIFEST = "MANIFEST.json"
MAX_ENTRY_BYTES = 5_000_000  # real entries are a few KB; refuse anything absurd
_MEMBER = re.compile(rf"({'|'.join(SHARED)})/[0-9a-f]{{64}}\.json")

log = logging.getLogger(__name__)


def export_cache(cache_dir: Path, archive: Path) -> dict[str, Any]:
    """Zip the shared namespaces of a cache.

    Args:
        cache_dir: Cache root.
        archive: Zip file to write.

    Returns:
        The manifest stored in the zip: creation time, entries per namespace, total.

    Raises:
        ValueError: If the cache holds no shareable entries.
    """
    entries = {
        ns: sorted((cache_dir / ns).glob("*.json"))
        for ns in SHARED
        if (cache_dir / ns).is_dir()
    }
    counts = {ns: len(files) for ns, files in entries.items() if files}
    if not counts:
        raise ValueError(f"No cache entries to export in {cache_dir}")
    manifest: dict[str, Any] = {
        "created": datetime.now(UTC).isoformat(timespec="seconds"),
        "namespaces": counts,
        "total": sum(counts.values()),
    }
    archive.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(MANIFEST, json.dumps(manifest, indent=2))
        for ns, files in entries.items():
            for file in files:
                z.write(file, f"{ns}/{file.name}")
    return manifest


def _checked(z: zipfile.ZipFile) -> dict[str, bytes]:
    """Read every cache member, refusing anything unexpected before writing."""
    members: dict[str, bytes] = {}
    for info in z.infolist():
        if info.filename == MANIFEST:
            continue
        if not _MEMBER.fullmatch(info.filename):
            raise ValueError(f"Unexpected member {info.filename!r} in archive")
        if info.file_size > MAX_ENTRY_BYTES:
            raise ValueError(f"Not a cache entry (too large): {info.filename!r}")
        data = z.read(info)
        try:
            entry: Any = json.loads(data)
        except ValueError:
            entry = None
        if not (isinstance(entry, dict) and {FETCHED_AT, PAYLOAD} <= entry.keys()):  # pyright: ignore[reportUnknownMemberType]
            raise ValueError(f"Not a cache entry: {info.filename!r}")
        members[info.filename] = data
    return members


def import_cache(archive: Path, cache_dir: Path) -> dict[str, int]:
    """Copy a shared cache zip into ``cache_dir`` without overwriting anything.

    Args:
        archive: Zip written by :func:`export_cache`.
        cache_dir: Cache root to fill.

    Returns:
        ``{"imported": n, "skipped": m}``; skipped entries already existed.

    Raises:
        ValueError: If any member is not a plain cache entry; nothing is written.
    """
    with zipfile.ZipFile(archive) as z:
        members = _checked(z)
    imported = skipped = 0
    for name, data in members.items():
        path = cache_dir / name
        if path.exists():
            skipped += 1
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        write_atomic(path, data)
        imported += 1
    return {"imported": imported, "skipped": skipped}


def main() -> None:
    """Command line: ``export`` or ``import`` a cache zip."""
    parser = argparse.ArgumentParser(description="Export or import the NASA cache zip")
    parser.add_argument("action", choices=("export", "import"))
    parser.add_argument("archive", type=Path, help="zip file to write or read")
    parser.add_argument("--cache-dir", type=Path, default=Settings().cache_dir)
    args = parser.parse_args()
    if args.action == "export":
        manifest = export_cache(args.cache_dir, args.archive)
        log.info(
            "exported %d entries %s to %s",
            manifest["total"],
            manifest["namespaces"],
            args.archive,
        )
    else:
        log.info(
            "%s into %s", import_cache(args.archive, args.cache_dir), args.cache_dir
        )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
