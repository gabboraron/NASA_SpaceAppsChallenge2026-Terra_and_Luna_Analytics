"""SMAP soil moisture for whatever area the map shows, loaded in the background.

The world's SMAP grid is cut into square blocks of cells. A view asks for the
blocks it touches: fetched ones answer at once, the others are queued and read by
one background thread (a block's season and baseline are 286 remote reads, a few
minutes on a cold cache), while the view polls for progress. The blocks around a
view are queued after it, so panning usually lands on data that is already there.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from functools import partial
from pathlib import Path
from threading import Lock, Thread
from time import monotonic

from pollination import models as m
from pollination.engine.timeline import smap_cells as week_cells
from pollination.geo import Bbox, SmapCell, smap_cells
from pollination.nasa import smap
from pollination.nasa.failure import attempt
from pollination.nasa.smap import SmapSeason

log = logging.getLogger(__name__)

BLOCK_CELLS = 16  # cells per block side: about 144 km
MAX_VIEW_BLOCKS = 6  # a wider view is asked to zoom in
MAX_QUEUE = 16  # blocks waiting; older prefetches beyond this are dropped
RETRY_FAILED_S = 120.0
ZOOM_IN = "Zoom in to load soil moisture for this view"

type Block = tuple[int, int]  # block row, block column
type Key = tuple[int, Block]  # season year, block
type Progress = Callable[[int, int], None]
type Fetch = Callable[[int, list[SmapCell], Progress], SmapSeason]

# shortcut: fetched blocks stay in memory for the life of the process (a block's
# season is about 7,000 small values); evict the oldest if visitors roam widely.
_done: dict[Key, tuple[SmapSeason | str, float]] = {}
_queue: list[Key] = []  # next to fetch first
_progress: dict[Key, tuple[int, int]] = {}  # the block being fetched
_running = False
_lock = Lock()


def view_blocks(bbox: Bbox) -> list[Block]:
    """The blocks a (west, south, east, north) view touches."""
    return sorted(
        {(c.row // BLOCK_CELLS, c.col // BLOCK_CELLS) for c in smap_cells(bbox)}
    )


def block_cells(block: Block) -> list[SmapCell]:
    """Every cell of a block."""
    row0, col0 = block[0] * BLOCK_CELLS, block[1] * BLOCK_CELLS
    return [
        SmapCell(row, col)
        for row in range(row0, row0 + BLOCK_CELLS)
        for col in range(col0, col0 + BLOCK_CELLS)
    ]


def _around(blocks: list[Block]) -> list[Block]:
    """The blocks bordering ``blocks``, to fetch before the view gets there."""
    ring = {
        (r + dr, c + dc) for r, c in blocks for dr in (-1, 0, 1) for dc in (-1, 0, 1)
    }
    return sorted(ring - set(blocks))


def live_fetch(cache_dir: Path) -> Fetch:
    """The fetch that reads SMAP from NASA (and the on-disk cache)."""

    def fetch(year: int, cells: list[SmapCell], progress: Progress) -> SmapSeason:
        return smap.season(year, cells=cells, cache_dir=cache_dir, progress=progress)

    return fetch


def _note(key: Key, done: int, total: int) -> None:
    """Record how many of a block's reads are done."""
    with _lock:
        if key in _progress:
            _progress[key] = (done, total)


def _work(fetch: Fetch) -> None:
    """Background thread: fetch queued blocks until none are left."""
    global _running  # noqa: PLW0603 - one worker thread per server process
    while True:
        with _lock:
            if not _queue:
                _running = False
                return
            key = _queue.pop(0)
            _progress[key] = (0, 1)
        year, block = key
        season, _ = attempt(
            "SMAP", partial(fetch, year, block_cells(block), partial(_note, key))
        )
        with _lock:
            _done[key] = (season, monotonic())
            _progress.pop(key, None)


def _fresh(key: Key) -> bool:
    """Whether a block is fetched (a failed one only counts for a while)."""
    held = _done.get(key)
    if held is None:
        return False
    return not isinstance(held[0], str) or monotonic() - held[1] < RETRY_FAILED_S


def area(year: int, week: int, bbox: Bbox, fetch: Fetch | None) -> m.SmapArea:
    """One week's SMAP cells under a view, queueing what is not fetched yet.

    Args:
        year: Season year.
        week: Timeline week.
        bbox: The view: west, south, east, north.
        fetch: Reads a block's season; None when SMAP cannot be read live, so
            only blocks fetched earlier answer.

    Returns:
        The fetched cells of the view's blocks, and how far the rest has got.
    """
    global _running  # noqa: PLW0603 - one worker thread per server process
    blocks = view_blocks(bbox)
    if len(blocks) > MAX_VIEW_BLOCKS:
        return m.SmapArea(cells=[], note=ZOOM_IN)
    keys = [(year, b) for b in blocks]
    with _lock:
        missing = [k for k in keys if not _fresh(k)]
        if fetch is not None:
            nearby = [k for b in _around(blocks) if not _fresh(k := (year, b))]
            wanted = [k for k in (*missing, *nearby) if k not in _progress]
            rest = [k for k in _queue if k not in wanted]
            _queue[:] = (wanted + rest)[:MAX_QUEUE]
            if _queue and not _running:
                _running = True
                Thread(target=_work, args=(fetch,), daemon=True).start()
        held = [_done[k][0] for k in keys if k in _done]
        steps = [_progress.get(k, (0, 1)) for k in missing]
    cells = [c for season in held for c in week_cells(season, week)]
    failed = next((s for s in held if isinstance(s, str)), "")
    if not missing:
        return m.SmapArea(cells=cells, note=failed)
    if fetch is None:  # no token: the season's own cells are all there is
        return m.SmapArea(cells=cells)
    # Each block counts the same, whatever its number of reads.
    done = sum(d / max(t, 1) for d, t in steps)
    progress = m.FetchProgress(
        source="SMAP", done=round(100 * done / len(steps)), total=100
    )
    return m.SmapArea(cells=cells, pending=True, progress=progress, note=failed)
