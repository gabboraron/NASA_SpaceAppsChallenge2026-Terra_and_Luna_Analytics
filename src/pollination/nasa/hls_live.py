# pyright: basic
# (basic mode: rasterio and earthaccess ship no type stubs)
"""Live NASA access for HLS: CMR search and remote band-window reads.

Thin adapter around ``earthaccess`` and ``rasterio``. It is NOT unit-tested: it
needs Earthdata credentials in ``.env`` and network access, so verify it with a
real run (see ``scripts/hls_series.py``). All logic lives in
:mod:`pollination.nasa.hls`.
"""

from __future__ import annotations

from contextlib import ExitStack, closing
from datetime import date
from functools import cache
from pathlib import Path
from typing import Any

import earthaccess
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
    # earthaccess annotates open() as a filesystem; it returns a list of file objects.
    remote: list[Any] = earthaccess.open([scene.urls[role] for role in _ROLES])  # type: ignore[assignment]  # wrong return annotation upstream
    with ExitStack() as stack:
        bands = {
            role: stack.enter_context(rasterio.open(stack.enter_context(closing(f))))
            for role, f in zip(_ROLES, remote, strict=True)
        }
        ref = bands["red"]
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
            return None
        row0, col0 = ref.index(left, top)
        row1, col1 = ref.index(right, bottom)
        window = Window.from_slices((row0, row1 + 1), (col0, col1 + 1))

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
