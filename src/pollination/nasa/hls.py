"""HLS (Harmonized Landsat Sentinel-2) NDVI and NDYI per parcel.

Pure logic only: masking, index maths, per-scene caching and the public
functions. Reading real scenes from NASA is injected (``search`` / ``read``) and
implemented in :mod:`pollination.nasa.hls_live`.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Callable, Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date, timedelta
from functools import partial
from pathlib import Path
from typing import Any, cast

import numpy as np
from numpy.typing import NDArray
from pydantic import BaseModel
from shapely.geometry import Polygon, shape

from pollination.models import (
    HlsResponse,
    Measurement,
    Parcel,
    Provenance,
)
from pollination.models import Polygon as GeoPolygon
from pollination.nasa.cache import get_or_fetch

SOURCE = "NASA HLS S30/L30 v2.0"
MIN_VALID_FRACTION = 0.5
# Fmask bits 1-5: cloud, adjacent to cloud/shadow, cloud shadow, snow/ice, water.
# Bit 0 (cirrus) and the aerosol bits 6-7 are tolerated.
_INVALID_FMASK_BITS = 0b00111110
_COORD_DECIMALS = 6
_WORKERS = 4  # parallel remote reads; more got connections reset by the server
DEFAULT_PER_WEEK = 2  # usable observations kept per parcel and 7-day block
_UNKNOWN_CLOUD = 100.0

type Bbox = tuple[float, float, float, float]


class Obs(BaseModel):
    """One usable observation of a parcel on one scene."""

    day: date
    ndvi: float
    ndyi: float
    valid_fraction: float
    scene_id: str


@dataclass(frozen=True)
class Scene:
    """One HLS granule: id, acquisition day and the URL of each needed band."""

    id: str
    day: date
    urls: dict[str, str]
    cloud: float | None = None  # CMR scene cloud cover in percent, if known


@dataclass
class BandWindow:
    """Bands of one scene cut to a parcel's bounding box.

    Reflectance arrays are float32 ``(rows, cols)`` already scaled by 0.0001, with
    NaN where the product has no data. ``fmask`` is uint8 ``(rows, cols)`` and
    ``inside`` is the parcel footprint, bool ``(rows, cols)``.
    """

    blue: NDArray[np.float32]
    green: NDArray[np.float32]
    red: NDArray[np.float32]
    nir: NDArray[np.float32]
    fmask: NDArray[np.uint8]
    inside: NDArray[np.bool_]


type SearchFn = Callable[[Bbox, date, date], list[Scene]]
type ReadFn = Callable[[Scene, Polygon], BandWindow | None]


def scene_day(granule_id: str) -> date:
    """Return the acquisition day from an HLS granule id.

    Args:
        granule_id: e.g. ``HLS.S30.T34TFT.2024186T094031.v2.0`` (year + day of year).

    Returns:
        The calendar date.

    Raises:
        ValueError: If the id has no ``YYYYDDDTHHMMSS`` part.
    """
    match = re.search(r"\.(\d{4})(\d{3})T\d{6}\.", granule_id)
    if match is None:
        raise ValueError(f"No acquisition time in granule id {granule_id!r}")
    return date(int(match[1]), 1, 1) + timedelta(days=int(match[2]) - 1)


def valid_mask(fmask: NDArray[np.uint8]) -> NDArray[np.bool_]:
    """Return True where Fmask has no cloud, shadow, snow or water flag."""
    return (fmask & np.uint8(_INVALID_FMASK_BITS)) == 0


def normalized_difference(
    a: NDArray[np.float32], b: NDArray[np.float32]
) -> NDArray[np.float32]:
    """Return ``(a - b) / (a + b)``, NaN where ``a + b`` is zero."""
    total = a + b
    out = np.full(total.shape, np.nan, dtype=np.float32)
    np.divide(a - b, total, out=out, where=total != 0)
    return out


def summarize(win: BandWindow) -> tuple[float, float, float] | None:
    """Mean NDVI, mean NDYI and valid-pixel fraction of a parcel window.

    NDVI = (NIR - Red) / (NIR + Red); NDYI = (Green - Blue) / (Green + Blue).

    Returns:
        ``(ndvi, ndyi, valid_fraction)``, or None if the parcel covers no pixel or
        fewer than 50 percent of its pixels are usable.
    """
    n_inside = int(win.inside.sum())
    if n_inside == 0:
        return None
    finite = (
        np.isfinite(win.blue)
        & np.isfinite(win.green)
        & np.isfinite(win.red)
        & np.isfinite(win.nir)
    )
    ok = win.inside & valid_mask(win.fmask) & finite
    valid_fraction = float(ok.sum()) / n_inside
    if valid_fraction < MIN_VALID_FRACTION:
        return None
    ndvi = normalized_difference(win.nir, win.red)[ok]
    ndyi = normalized_difference(win.green, win.blue)[ok]
    ndvi, ndyi = ndvi[np.isfinite(ndvi)], ndyi[np.isfinite(ndyi)]
    if ndvi.size == 0 or ndyi.size == 0:
        return None
    return float(ndvi.mean()), float(ndyi.mean()), valid_fraction


def _overpass_key(scene_id: str) -> tuple[str, str]:
    """Return ``(sensor, acquisition timestamp)`` of a granule id, tile excluded."""
    _, sensor, _, stamp, *_ = scene_id.split(".")
    return sensor, stamp


def passes(scenes: Sequence[Scene]) -> list[list[Scene]]:
    """Group scenes that are one sensor pass seen through overlapping tiles.

    HLS tiles overlap, so a parcel there is covered twice by the same pass; the
    tiles differ only in the tile id. Reading one of them is enough.

    Args:
        scenes: Scenes found for one parcel.

    Returns:
        One group per pass, tiles sorted by id, groups sorted by day.
    """
    groups: dict[tuple[str, str], list[Scene]] = {}
    for scene in sorted(scenes, key=lambda s: s.id):
        groups.setdefault(_overpass_key(scene.id), []).append(scene)
    return sorted(groups.values(), key=lambda g: (g[0].day, g[0].id))


def weeks_of_passes(
    groups: Sequence[list[Scene]], start: date
) -> list[list[list[Scene]]]:
    """Split passes into 7-day blocks counted from ``start``, clearest first.

    Args:
        groups: Output of :func:`passes`.
        start: First day of the search; block 0 is its first seven days.

    Returns:
        One list of passes per block with data, ordered by CMR cloud cover (unknown
        counts as 100 percent), then day.
    """
    blocks: dict[int, list[list[Scene]]] = {}
    for group in groups:
        blocks.setdefault((group[0].day - start).days // 7, []).append(group)

    def clearness(group: list[Scene]) -> tuple[float, date, str]:
        clouds = [s.cloud for s in group if s.cloud is not None]
        return (min(clouds, default=_UNKNOWN_CLOUD), group[0].day, group[0].id)

    return [sorted(blocks[k], key=clearness) for k in sorted(blocks)]


def _geometry_hash(polygon: Polygon) -> str:
    """Stable hash of a polygon's rounded coordinates, for cache keys."""
    coords = [
        [round(x, _COORD_DECIMALS), round(y, _COORD_DECIMALS)]
        for x, y in polygon.exterior.coords
    ]
    return hashlib.sha256(json.dumps(coords).encode()).hexdigest()[:16]


def _observe(
    scene: Scene, polygon: Polygon, read: ReadFn, cache_dir: Path | None
) -> Obs | None:
    """Observation of one parcel on one scene, cached (also when there is none)."""

    def fetch() -> dict[str, Any]:
        win = read(scene, polygon)
        result = summarize(win) if win is not None else None
        if result is None:
            return {"obs": None}
        ndvi, ndyi, fraction = result
        return {"obs": {"ndvi": ndvi, "ndyi": ndyi, "valid_fraction": fraction}}

    key = {"scene": scene.id, "geometry": _geometry_hash(polygon)}
    payload = get_or_fetch("hls", key, fetch, cache_dir)
    obs: Any = payload["obs"]
    if obs is None:
        return None
    return Obs(day=scene.day, scene_id=scene.id, **obs)


def _scenes(
    search: SearchFn, bounds: Bbox, days: tuple[date, date], cache_dir: Path | None
) -> list[Scene]:
    """Scenes of a period; a finished period is searched once and cached.

    A warm cache then needs no CMR round trip. A period that includes today is
    searched live every time, because new scenes keep arriving.
    """
    if days[1] >= date.today():  # calendar day of the server
        return search(bounds, *days)
    key = {
        "search": [round(b, _COORD_DECIMALS) for b in bounds],
        "start": days[0].isoformat(),
        "end": days[1].isoformat(),
    }

    def fetch() -> dict[str, Any]:
        found = search(bounds, *days)
        return {
            "scenes": [
                {"id": s.id, "day": s.day.isoformat(), "urls": s.urls, "cloud": s.cloud}
                for s in found
            ]
        }

    listed: list[dict[str, Any]] = get_or_fetch("hls", key, fetch, cache_dir)["scenes"]
    return [
        Scene(x["id"], date.fromisoformat(x["day"]), x["urls"], x["cloud"])
        for x in listed
    ]


def _observe_pass(
    group: list[Scene], polygon: Polygon, read: ReadFn, cache_dir: Path | None
) -> Obs | None:
    """Observation of one pass: the first tile that has usable data for the parcel."""
    return next(
        (o for s in group if (o := _observe(s, polygon, read, cache_dir))), None
    )


def _newest(
    groups: Sequence[list[Scene]],
    polygon: Polygon,
    read: ReadFn,
    cache_dir: Path | None,
) -> Obs | None:
    """The newest usable observation, reading passes newest first and stopping."""
    for group in sorted(groups, key=lambda g: (g[0].day, g[0].id), reverse=True):
        obs = _observe_pass(group, polygon, read, cache_dir)
        if obs is not None:
            return obs
    return None


def _observe_week(
    week: list[list[Scene]],
    polygon: Polygon,
    read: ReadFn,
    cache_dir: Path | None,
    per_week: int | None,
) -> list[Obs]:
    """Usable observations of one block, reading passes clearest first.

    One tile per pass is read (the next tile only if the first has no data for the
    parcel); reading stops at ``per_week`` observations.
    """
    found: list[Obs] = []
    for group in week:
        obs = _observe_pass(group, polygon, read, cache_dir)
        if obs is not None:
            found.append(obs)
            if per_week is not None and len(found) >= per_week:
                break
    return found


@dataclass(frozen=True)
class _Io:
    """Injectable scene search, scene reader, cache location and weekly cap."""

    search: SearchFn | None
    read: ReadFn | None
    cache_dir: Path | None
    per_week: int | None


def _backend(search: SearchFn | None, read: ReadFn | None) -> tuple[SearchFn, ReadFn]:
    """The injected search and read functions, or the live NASA ones."""
    if search is None or read is None:
        from pollination.nasa import hls_live  # noqa: PLC0415  # lazy: needs NASA libs

        search = search or hls_live.search_scenes
        read = read or hls_live.read_window
    return search, read


def _indices(
    polygons: Mapping[str, Polygon], days: tuple[date, date], io: _Io
) -> dict[str, list[Obs]]:
    """Shared core of :func:`parcel_indices` and :func:`latest_for_polygon`.

    Scenes are searched per parcel (only tiles that cover it); the 7-day blocks are
    read on a thread pool, because every read is a remote round trip.
    """
    search, read = _backend(io.search, io.read)
    result: dict[str, list[Obs]] = {}
    for pid, polygon in polygons.items():
        scenes = _scenes(search, polygon.bounds, days, io.cache_dir)
        weeks = weeks_of_passes(passes(scenes), days[0])
        observe = partial(
            _observe_week,
            polygon=polygon,
            read=read,
            cache_dir=io.cache_dir,
            per_week=io.per_week,
        )
        with ThreadPoolExecutor(max_workers=_WORKERS) as pool:
            observations = [o for week in pool.map(observe, weeks) for o in week]
        result[pid] = sorted(observations, key=lambda o: (o.day, o.scene_id))
    return result


def parcel_indices(  # noqa: PLR0913  # injectable search/read/cache keep it testable
    parcels: Sequence[Parcel],
    start: date,
    end: date,
    *,
    search: SearchFn | None = None,
    read: ReadFn | None = None,
    cache_dir: Path | None = None,
    per_week: int | None = DEFAULT_PER_WEEK,
) -> dict[str, list[Obs]]:
    """Return NDVI/NDYI observations per parcel between two dates.

    Scenes with fewer than 50 percent usable pixels over a parcel are dropped. Per
    7-day block the clearest passes are read until ``per_week`` usable observations
    are found, and a pass seen through two overlapping tiles is read once. Results
    are cached per scene and parcel geometry.

    Args:
        parcels: Parcels to observe.
        start: First day, inclusive.
        end: Last day, inclusive.
        search: Scene search; defaults to NASA CMR via earthaccess.
        read: Scene window reader; defaults to remote cloud-optimised GeoTIFF reads.
        cache_dir: Cache root; defaults to the configured one.
        per_week: Usable observations wanted per 7-day block; None reads all passes.

    Returns:
        Observations keyed by parcel id, sorted by date.
    """
    polygons = {p.id: cast(Polygon, shape(p.geometry.model_dump())) for p in parcels}
    io = _Io(search, read, cache_dir, per_week)
    return _indices(polygons, (start, end), io)


def latest_for_polygon(  # noqa: PLR0913  # injectable search/read/cache keep it testable
    polygon: GeoPolygon,
    days: int = 30,
    *,
    today: date | None = None,
    search: SearchFn | None = None,
    read: ReadFn | None = None,
    cache_dir: Path | None = None,
) -> HlsResponse:
    """Latest usable HLS observation of a drawn polygon, or an explained gap.

    Args:
        polygon: Drawn polygon in lon/lat.
        days: How far back to look.
        today: Reference day; defaults to the current date.
        search: Scene search; defaults to NASA CMR via earthaccess.
        read: Scene window reader; defaults to remote reads.
        cache_dir: Cache root; defaults to the configured one.

    Returns:
        The newest usable observation (passes are read newest first and reading
        stops at the first usable one), or Missing measurements with a reason.
    """
    end = today or date.today()  # calendar day of the server
    start = end - timedelta(days=days)
    geom = cast(Polygon, shape(polygon.model_dump()))
    search_fn, read_fn = _backend(search, read)
    scenes = _scenes(search_fn, geom.bounds, (start, end), cache_dir)
    latest = _newest(passes(scenes), geom, read_fn, cache_dir)
    if latest is None:
        missing = Provenance(
            kind="Missing",
            source=SOURCE,
            observed_at=None,
            note=(
                f"No usable observation in the last {days} days: cloud, shadow, "
                "snow or water masked, or no overpass."
            ),
        )
        gap = Measurement(value=None, provenance=missing)
        return HlsResponse(observed_at=None, ndvi=gap, ndyi=gap)
    provenance = Provenance(
        kind="Observed",
        source=SOURCE,
        observed_at=latest.day,
        note=(
            f"{latest.valid_fraction:.0%} of parcel pixels valid, "
            f"scene {latest.scene_id}"
        ),
    )
    return HlsResponse(
        observed_at=latest.day,
        ndvi=Measurement(value=latest.ndvi, provenance=provenance),
        ndyi=Measurement(value=latest.ndyi, provenance=provenance),
    )
