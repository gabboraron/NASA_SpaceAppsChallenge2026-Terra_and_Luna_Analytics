# pyright: basic
# (basic mode: rasterio and earthaccess ship no type stubs)
"""Live NASA access for HLS: CMR search and remote band-window reads.

Thin adapter around ``earthaccess``, ``httpx`` and ``rasterio``. It is NOT
unit-tested: it needs ``EARTHDATA_TOKEN`` in ``.env`` and network access, so verify
it with a real run (see ``scripts/hls_series.py``). All logic lives in
:mod:`pollination.nasa.hls`.

Reads are true range reads: the bearer token is exchanged for the presigned
storage URL (a 303 redirect), which GDAL then reads through ``/vsicurl/``. Opening
the earthaccess file objects instead makes rasterio download whole bands.
"""

from __future__ import annotations

import os
import time
from contextlib import ExitStack
from datetime import date
from functools import cache
from pathlib import Path
from typing import Any

import earthaccess
import httpx
import numpy as np
import rasterio
import shapely
from dotenv import load_dotenv
from pyproj import Transformer
from rasterio.features import geometry_mask
from rasterio.windows import Window
from shapely.geometry import Polygon, mapping

from pollination.nasa.hls import BandWindow, Bbox, Scene, scene_day

SCALE = 0.0001
FILL_VALUE = -9999
MAX_SCENE_CLOUD_PERCENT = 80  # coarse CMR pre-filter; the parcel mask decides
HTTP_TIMEOUT_S = 30
REDIRECT_STATUSES = (301, 302, 303, 307)
RETRY_STATUSES = (429, 500, 502, 503, 504)
PRESIGN_ATTEMPTS = 5
BACKOFF_S = 2.0
_CLIENT = httpx.Client(  # shared: reuses connections instead of opening one per band
    timeout=HTTP_TIMEOUT_S,
    limits=httpx.Limits(max_connections=8, max_keepalive_connections=8),
)
# Band file suffix per role; the NIR band differs between Sentinel-2 and Landsat.
_COMMON = {"blue": "B02", "green": "B03", "red": "B04", "fmask": "Fmask"}
_PRODUCTS = {"HLSS30": {**_COMMON, "nir": "B8A"}, "HLSL30": {**_COMMON, "nir": "B05"}}
_ROLES = ("blue", "green", "red", "nir", "fmask")
_REPO_ROOT = Path(__file__).resolve().parents[3]


@cache
def _login() -> None:
    """Log in to Earthdata once, from ``.env`` / environment variables."""
    load_dotenv(_REPO_ROOT / ".env")
    earthaccess.login(strategy="environment")


def search_scenes(bbox: Bbox, start: date, end: date) -> list[Scene]:
    """Find HLS S30 and L30 v2.0 granules intersecting ``bbox`` between two days.

    Args:
        bbox: West, south, east, north in degrees.
        start: First day, inclusive.
        end: Last day, inclusive.

    Returns:
        Scenes that have all five bands needed (blue, green, red, NIR, Fmask).
    """
    _login()
    scenes: list[Scene] = []
    for short_name, suffixes in _PRODUCTS.items():
        granules = earthaccess.search_data(
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
                scenes.append(Scene(granule_id, scene_day(granule_id), urls))
    return scenes


def _presigned(url: str) -> str:
    """Exchange the Earthdata bearer token for the presigned storage URL.

    Retries transport errors and 429/5xx answers with exponential backoff.
    """
    token = os.environ.get("EARTHDATA_TOKEN")
    if not token:
        raise RuntimeError("EARTHDATA_TOKEN is required in .env for HLS range reads")
    headers = {"Authorization": f"Bearer {token}", "Range": "bytes=0-0"}
    for attempt in range(PRESIGN_ATTEMPTS):
        try:
            response = _CLIENT.get(url, headers=headers, follow_redirects=False)
        except httpx.TransportError:
            if attempt == PRESIGN_ATTEMPTS - 1:
                raise
        else:
            location = response.headers.get("location")
            if response.status_code in REDIRECT_STATUSES and location:
                return location
            if response.status_code not in RETRY_STATUSES:
                raise RuntimeError(
                    f"Expected a redirect for {url}, got {response.status_code}"
                )
        time.sleep(BACKOFF_S * 2**attempt)
    raise RuntimeError(f"No presigned URL for {url} after {PRESIGN_ATTEMPTS} attempts")


def read_window(scene: Scene, polygon: Polygon) -> BandWindow | None:
    """Read the five bands of ``scene`` over a parcel's bounding box.

    Args:
        scene: Granule with the URL of each band.
        polygon: Parcel footprint in lon/lat.

    Returns:
        Scaled reflectance, Fmask and the parcel pixel mask, or None if the parcel
        is not fully inside this granule's tile.
    """
    _login()
    with (
        rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            GDAL_HTTP_MAX_RETRY="3",
            GDAL_HTTP_TIMEOUT=str(HTTP_TIMEOUT_S),
        ),
        ExitStack() as stack,
    ):

        def open_band(role: str) -> Any:
            url = "/vsicurl/" + _presigned(scene.urls[role])
            return stack.enter_context(rasterio.open(url))

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
