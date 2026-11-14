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
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any, cast

import numpy as np
from numpy.typing import NDArray
from pydantic import BaseModel
from shapely.geometry import Polygon, shape

from pollination.config import Settings
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


@dataclass(frozen=True)
class _Io:
    """Injectable scene search, scene reader and cache location."""

    search: SearchFn | None
    read: ReadFn | None
    cache_dir: Path | None


def _indices(
    polygons: Mapping[str, Polygon], bbox: Bbox, days: tuple[date, date], io: _Io
) -> dict[str, list[Obs]]:
    """Shared core of :func:`parcel_indices` and :func:`latest_for_polygon`."""
    search, read = io.search, io.read
    if search is None or read is None:
        from pollination.nasa import hls_live  # noqa: PLC0415  # lazy: needs NASA libs

        search = search or hls_live.search_scenes
        read = read or hls_live.read_window
    scenes = search(bbox, days[0], days[1])
    result: dict[str, list[Obs]] = {}
    for pid, polygon in polygons.items():
        observations = [
            obs
            for scene in scenes
            if (obs := _observe(scene, polygon, read, io.cache_dir)) is not None
        ]
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
) -> dict[str, list[Obs]]:
    """Return NDVI/NDYI observations per parcel between two dates.

    Scenes with fewer than 50 percent usable pixels over a parcel are dropped.
    Results are cached per scene and parcel geometry.

    Args:
        parcels: Parcels to observe.
        start: First day, inclusive.
        end: Last day, inclusive.
        search: Scene search; defaults to NASA CMR via earthaccess.
        read: Scene window reader; defaults to remote cloud-optimised GeoTIFF reads.
        cache_dir: Cache root; defaults to the configured one.

    Returns:
        Observations keyed by parcel id, sorted by date.
    """
    polygons = {p.id: cast(Polygon, shape(p.geometry.model_dump())) for p in parcels}
    io = _Io(search, read, cache_dir)
    return _indices(polygons, Settings().bbox, (start, end), io)


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
        The newest observation, or Missing measurements with a reason.
    """
    end = today or date.today()  # calendar day of the server
    start = end - timedelta(days=days)
    geom = cast(Polygon, shape(polygon.model_dump()))
    io = _Io(search, read, cache_dir)
    found = _indices({"drawn": geom}, geom.bounds, (start, end), io)
    observations = found["drawn"]
    if not observations:
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
    latest = max(observations, key=lambda o: (o.day, o.valid_fraction))
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
