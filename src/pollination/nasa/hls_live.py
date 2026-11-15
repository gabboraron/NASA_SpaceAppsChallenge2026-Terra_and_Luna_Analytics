# pyright: basic
# (basic mode: rasterio and earthaccess ship no type stubs)
"""Live access to HLS: scene search and remote band-window reads.

Scenes come from the Planetary Computer mirror (:mod:`pollination.nasa.hls_pc`,
no login) and, when it is switched off, fails or has nothing, from NASA CMR.

Thin adapter around ``earthaccess``, ``httpx`` and ``rasterio``. It is NOT
unit-tested: it needs ``EARTHDATA_TOKEN`` in ``.env`` and network access, so verify
it with a real run (see ``scripts/hls_series.py``). All logic lives in
:mod:`pollination.nasa.hls`.

Reads are true range reads: the bearer token is exchanged for the presigned
storage URL (a 303 redirect), which GDAL then reads through ``/vsicurl/``. Opening
the earthaccess file objects instead makes rasterio download whole bands.
"""

from __future__ import annotations

import logging
from contextlib import ExitStack
from datetime import date
from typing import Any

import numpy as np
import rasterio
import shapely
from pyproj import Transformer
from rasterio.features import geometry_mask
from rasterio.windows import Window
from shapely.geometry import Polygon, mapping

from pollination.config import Settings
from pollination.geo import Bbox
from pollination.nasa import earthdata, hls_pc
from pollination.nasa.earthdata import login
from pollination.nasa.hls import BandWindow, Scene, scene_day
from pollination.nasa.hls_pc import (
    COMMON_BANDS,
    HTTP_TIMEOUT_S,
    MAX_SCENE_CLOUD_PERCENT,
)

log = logging.getLogger(__name__)

SCALE = 0.0001
FILL_VALUE = -9999
REDIRECT_STATUSES = (301, 302, 303, 307)
# Band file suffix per role; the NIR band differs between Sentinel-2 and Landsat.
_PRODUCTS = {
    "HLSS30": {**COMMON_BANDS, "nir": "B8A"},
    "HLSL30": {**COMMON_BANDS, "nir": "B05"},
}
_ROLES = ("blue", "green", "red", "nir", "fmask")


def _cloud(granule: Any) -> float | None:
    """Scene cloud cover in percent from the CMR ``CLOUD_COVERAGE`` attribute."""
    for attribute in granule["umm"].get("AdditionalAttributes", []):
        if attribute.get("Name") == "CLOUD_COVERAGE":
            try:
                return float(attribute["Values"][0])
            except (KeyError, IndexError, ValueError):
                return None
    return None


def search_scenes(bbox: Bbox, start: date, end: date) -> list[Scene]:
    """Find HLS S30 and L30 v2.0 granules intersecting ``bbox`` between two days.

    Args:
        bbox: West, south, east, north in degrees.
        start: First day, inclusive.
        end: Last day, inclusive.

    Returns:
        Scenes that have all five bands needed (blue, green, red, NIR, Fmask).
    """
    login()
    scenes: list[Scene] = []
    for short_name, suffixes in _PRODUCTS.items():
        granules = earthdata.search(
            short_name=short_name,
            version="2.0",
            bounding_box=bbox,
            cloud_cover=(0, MAX_SCENE_CLOUD_PERCENT),
            temporal=(start.isoformat(), end.isoformat()),
        )
        for granule in granules:
            links = [
                u for u in granule.data_links() if u.split("?")[0].endswith(".tif")
            ]
            urls = {
                role: url
                for role, band in suffixes.items()
                for url in links
                if url.split("?")[0].endswith(f".{band}.tif")
            }
            if len(urls) == len(_ROLES):
                granule_id = granule["umm"]["GranuleUR"]
                scenes.append(
                    Scene(granule_id, scene_day(granule_id), urls, _cloud(granule))
                )
    return scenes


def search_any(bbox: Bbox, start: date, end: date) -> list[Scene]:
    """Find HLS scenes on the mirror, or at NASA when the mirror cannot answer.

    NASA is asked when the mirror is switched off, fails or finds nothing (it
    starts in 2020 and trails NASA by some days), and only with an Earthdata token.

    Args:
        bbox: West, south, east, north in degrees.
        start: First day, inclusive.
        end: Last day, inclusive.

    Returns:
        Scenes that have all five bands needed.
    """
    settings = Settings()
    if not settings.planetary_computer:
        return search_scenes(bbox, start, end)
    if not settings.has_earthdata:
        return hls_pc.search_scenes(bbox, start, end)
    try:
        scenes = hls_pc.search_scenes(bbox, start, end)
    except Exception as exc:  # any mirror failure falls back to NASA
        log.warning("HLS mirror search failed, asking NASA: %s", exc)
        scenes = []
    return scenes or search_scenes(bbox, start, end)


def _presigned(url: str) -> str:
    """Exchange the Earthdata bearer token for the presigned storage URL."""
    login()
    response = earthdata.get(
        url,
        purpose="HLS range reads",
        timeout=HTTP_TIMEOUT_S,
        headers={"Range": "bytes=0-0"},
        follow_redirects=False,
    )
    location = response.headers.get("location")
    if response.status_code in REDIRECT_STATUSES and location:
        return location
    raise RuntimeError(f"Expected a redirect for {url}, got {response.status_code}")


def read_window(scene: Scene, polygon: Polygon) -> BandWindow | None:
    """Read the five bands of ``scene`` over a parcel's bounding box.

    Args:
        scene: Granule with the URL of each band.
        polygon: Parcel footprint in lon/lat.

    Returns:
        Scaled reflectance, Fmask and the parcel pixel mask, or None if the parcel
        is not fully inside this granule's tile.
    """
    with (
        rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            GDAL_HTTP_MAX_RETRY="3",
            GDAL_HTTP_TIMEOUT=str(HTTP_TIMEOUT_S),
        ),
        ExitStack() as stack,
    ):

        def open_band(role: str) -> Any:
            url = scene.urls[role]  # a cached search may still hold NASA URLs
            readable = hls_pc.sign(url) if hls_pc.is_mirror(url) else _presigned(url)
            return stack.enter_context(rasterio.open("/vsicurl/" + readable))

        ref = open_band("red")
        to_tile = Transformer.from_crs("EPSG:4326", ref.crs, always_xy=True)
        projected = shapely.transform(
            polygon, lambda c: np.column_stack(to_tile.transform(c[:, 0], c[:, 1]))
        )
        left, bottom, right, top = projected.bounds
        edge = ref.bounds
        if (
            left < edge.left
            or right > edge.right
            or bottom < edge.bottom
            or top > edge.top
        ):
            return None  # another tile; checked before opening the other bands
        row0, col0 = ref.index(left, top)
        row1, col1 = ref.index(right, bottom)
        window = Window.from_slices((row0, row1 + 1), (col0, col1 + 1))
        bands = {"red": ref} | {
            role: open_band(role) for role in _ROLES if role != "red"
        }

        def reflectance(role: str) -> np.ndarray:
            raw = bands[role].read(1, window=window)
            return np.where(raw == FILL_VALUE, np.nan, raw * SCALE).astype(np.float32)

        inside = geometry_mask(
            [mapping(projected)],
            out_shape=(window.height, window.width),
            transform=ref.window_transform(window),
            invert=True,
        )
        return BandWindow(
            blue=reflectance("blue"),
            green=reflectance("green"),
            red=reflectance("red"),
            nir=reflectance("nir"),
            fmask=bands["fmask"].read(1, window=window).astype(np.uint8),
            inside=inside,
        )
