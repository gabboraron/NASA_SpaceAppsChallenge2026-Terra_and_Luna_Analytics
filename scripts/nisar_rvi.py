"""Return a NISAR GCOV dual-polarization RVI value for a coordinate.

The script searches ASF for the newest NISAR GCOV granule covering the point,
downloads that HDF5 product with the token in ``earthdata.key``, and samples
the HH/HV pixel nearest the requested coordinate.

Run with ``uv run python scripts/nisar_rvi.py 22.13 47.84``.
"""

# pyright: basic

import argparse
import json
import math
import os
import sys
import tempfile
from collections.abc import Iterator
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import asf_search as asf
import h5py
import httpx
import numpy as np
from pyproj import Transformer

from pollination.nasa.nisar import calculate_rvi

REPO_ROOT = Path(__file__).resolve().parents[1]
TOKEN_FILE = REPO_ROOT / "earthdata.key"
HTTP_TIMEOUT_S = 120.0
HH_PATH = "/science/LSAR/GCOV/grids/frequencyA/HHHH"
HV_PATH = "/science/LSAR/GCOV/grids/frequencyA/HVHV"
MIN_DIMENSIONS = 2
MIN_LONGITUDE = -180
MAX_LONGITUDE = 180
MIN_LATITUDE = -90
MAX_LATITUDE = 90


def _token(path: Path) -> str:
    """Read an Earthdata bearer token from a plain-text or JSON key file."""
    if not path.is_file():
        raise FileNotFoundError(f"Earthdata key file not found: {path}")
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"Earthdata key file is empty: {path}")
    if text.startswith("{"):
        payload = json.loads(text)
        for key in ("access_token", "token", "earthdata_token"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip().removeprefix("Bearer ").strip()
        raise ValueError("JSON Earthdata key must contain access_token or token")
    return text.removeprefix("Bearer ").strip()


def _granule_url(lon: float, lat: float, start: date, end: date) -> str:
    """Find the newest ASF NISAR GCOV granule intersecting a point."""
    point = f"POINT({lon} {lat})"
    results = asf.search(
        dataset=[asf.DATASET.NISAR],
        processingLevel=[asf.PRODUCT_TYPE.GCOV],
        intersectsWith=point,
        start=start.isoformat(),
        end=end.isoformat(),
        maxResults=10,
    )
    if not results:
        raise RuntimeError(f"No NISAR GCOV granule found for {lon}, {lat}")
    item = results[0]
    url = item.properties.get("url")
    if not isinstance(url, str) or not url:
        raise RuntimeError("ASF returned a granule without a download URL")
    return url


def _download(url: str, token: str, destination: Path) -> None:
    """Download one authenticated NISAR product to a local temporary file."""
    with httpx.stream(
        "GET",
        url,
        headers={"Authorization": f"Bearer {token}"},
        follow_redirects=True,
        timeout=HTTP_TIMEOUT_S,
    ) as response:
        response.raise_for_status()
        with destination.open("wb") as output:
            for chunk in response.iter_bytes():
                output.write(chunk)


def _datasets(group: h5py.Group) -> Iterator[h5py.Dataset]:
    """Yield every dataset below an HDF5 group."""
    for value in group.values():
        if isinstance(value, h5py.Dataset):
            yield value
        elif isinstance(value, h5py.Group):
            yield from _datasets(value)


def _polarization(product: h5py.File, path: str, suffix: str) -> h5py.Dataset:
    """Find a polarization dataset, tolerating product layout revisions."""
    if path in product:
        return product[path]
    for dataset in _datasets(product):
        if dataset.name.upper().endswith(suffix):
            return dataset
    raise RuntimeError(f"NISAR product has no {suffix} polarization dataset")


def _attribute(dataset: h5py.Dataset, names: tuple[str, ...]) -> float | None:
    """Get the first numeric attribute matching one of the supplied names."""
    for name in names:
        value = dataset.attrs.get(name)
        if value is not None:
            try:
                return float(np.asarray(value).reshape(-1)[0])
            except (TypeError, ValueError, IndexError):
                continue
    return None


def _grid(dataset: h5py.Dataset) -> tuple[np.ndarray, np.ndarray, int | None]:
    """Read GCOV grid coordinates and its projection code when available."""
    group = dataset.parent
    try:
        x_coordinates = np.asarray(group["xCoordinates"][:])
        y_coordinates = np.asarray(group["yCoordinates"][:])
    except (KeyError, TypeError):
        x_coordinates = np.array([])
        y_coordinates = np.array([])
    projection = None
    if "projection" in group:
        raw_projection = np.asarray(group["projection"][()]).reshape(-1)
        if raw_projection.size:
            projection = int(raw_projection[0])
    return x_coordinates, y_coordinates, projection


def _pixel(dataset: h5py.Dataset, lon: float, lat: float, epsg: int) -> float:
    """Read the nearest finite power value from a geocoded GCOV dataset."""
    if len(dataset.shape) != MIN_DIMENSIONS:
        raise RuntimeError(f"Expected a 2-D polarization dataset, got {dataset.shape}")
    x_coordinates, y_coordinates, grid_epsg = _grid(dataset)
    projection_epsg = grid_epsg or epsg
    x, y = Transformer.from_crs("EPSG:4326", projection_epsg, always_xy=True).transform(
        lon, lat
    )
    if x_coordinates.size and y_coordinates.size:
        col = int(np.argmin(np.abs(x_coordinates - x)))
        row = int(np.argmin(np.abs(y_coordinates - y)))
    else:
        x_start = _attribute(dataset, ("xCoordinateStart", "x_start"))
        y_start = _attribute(dataset, ("yCoordinateStart", "y_start"))
        x_step = _attribute(dataset, ("xCoordinateSpacing", "x_spacing"))
        y_step = _attribute(dataset, ("yCoordinateSpacing", "y_spacing"))
        if None in (x_start, y_start, x_step, y_step):
            raise RuntimeError("GCOV dataset does not expose a coordinate grid")
        col = round((x - x_start) / x_step)
        row = round((y - y_start) / y_step)
    if not (0 <= row < dataset.shape[0] and 0 <= col < dataset.shape[1]):
        raise RuntimeError("Coordinate is outside the selected NISAR tile")
    value = float(dataset[row, col])
    fill = _attribute(dataset, ("_FillValue", "fillValue"))
    if not math.isfinite(value) or (fill is not None and value == fill):
        raise RuntimeError("Selected NISAR pixel has no valid backscatter value")
    return value


def _utm_epsg(lon: float, lat: float) -> int:
    """Return the standard UTM EPSG code used by the GCOV tile."""
    zone = math.floor((lon + 180) / 6) + 1
    return (32600 if lat >= 0 else 32700) + zone


def rvi_for_coordinate(
    lon: float,
    lat: float,
    *,
    start: date,
    end: date,
    key_file: Path = TOKEN_FILE,
) -> dict[str, Any]:
    """Fetch and calculate RVI for the NISAR pixel nearest ``lon``, ``lat``.

    Args:
        lon: Longitude in degrees, between -180 and 180.
        lat: Latitude in degrees, between -90 and 90.
        start: First acquisition date to search.
        end: Last acquisition date to search.
        key_file: File containing the Earthdata API token.

    Returns:
        JSON-compatible coordinate, source URL, polarization and RVI details.

    Raises:
        ValueError: If the coordinate is outside the valid geographic range.
    """
    if (
        not MIN_LONGITUDE <= lon <= MAX_LONGITUDE
        or not MIN_LATITUDE <= lat <= MAX_LATITUDE
    ):
        raise ValueError("longitude must be in [-180, 180] and latitude in [-90, 90]")
    token = _token(key_file)
    url = _granule_url(lon, lat, start, end)
    with tempfile.TemporaryDirectory(prefix="nisar-rvi-") as directory:
        product_path = Path(directory) / "product.h5"
        _download(url, token, product_path)
        with h5py.File(product_path, "r") as product:
            hh = _polarization(product, HH_PATH, "HHHH")
            hv = _polarization(product, HV_PATH, "HVHV")
            epsg = _utm_epsg(lon, lat)
            hh_value = _pixel(hh, lon, lat, epsg)
            hv_value = _pixel(hv, lon, lat, epsg)
    return {
        "longitude": lon,
        "latitude": lat,
        "source": url,
        "hh": hh_value,
        "hv": hv_value,
        "rvi": calculate_rvi(hh_value, hv_value),
    }


def main() -> None:
    """Parse command-line coordinates and write one JSON result to stdout."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("longitude", type=float)
    parser.add_argument("latitude", type=float)
    parser.add_argument(
        "--start",
        type=date.fromisoformat,
        default=date.today() - timedelta(days=365),
        help="first acquisition date (YYYY-MM-DD, default: one year ago)",
    )
    parser.add_argument(
        "--end",
        type=date.fromisoformat,
        default=date.today(),
        help="last acquisition date (YYYY-MM-DD, default: today)",
    )
    parser.add_argument("--key-file", type=Path, default=TOKEN_FILE)
    args = parser.parse_args()
    if args.start > args.end:
        parser.error("--start must not be after --end")
    result = rvi_for_coordinate(
        args.longitude,
        args.latitude,
        start=args.start,
        end=args.end,
        key_file=args.key_file,
    )
    sys.stdout.write(json.dumps(result, indent=2) + os.linesep)


if __name__ == "__main__":
    main()
