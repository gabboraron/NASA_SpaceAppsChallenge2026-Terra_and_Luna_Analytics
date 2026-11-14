"""NASA POWER daily point client (agroclimatology community)."""

import math
from datetime import date, datetime
from pathlib import Path
from typing import Any

import httpx
from pydantic import BaseModel

from pollination.nasa.cache import get_or_fetch

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
DEFAULT_PARAMS = ("T2M_MAX", "T2M_MIN", "PRECTOTCORR", "WS2M")
# MERRA-2 native grid used by POWER meteorology; points map to the nearest node.
GRID_LAT_DEG = 0.5
GRID_LON_DEG = 0.625
FILL_VALUE = -999.0
TIMEOUT_S = 60.0


class PowerDaily(BaseModel):
    """Daily POWER series at one grid point.

    Attributes:
        lat: Latitude actually requested (nearest POWER grid node).
        lon: Longitude actually requested (nearest POWER grid node).
        days: Dates in ascending order.
        values: Parameter name to one value per day; ``None`` where POWER
            returned its fill value.
    """

    lat: float
    lon: float
    days: list[date]
    values: dict[str, list[float | None]]


def snap(coord: float, step: float) -> float:
    """Snap a coordinate to the nearest node of a regular grid.

    Args:
        coord: Latitude or longitude in degrees.
        step: Grid spacing in degrees (``GRID_LAT_DEG`` or ``GRID_LON_DEG``).

    Returns:
        The nearest grid node, rounded to avoid float noise in cache keys.
    """
    return round(math.floor(coord / step + 0.5) * step, 4)


def grid_node(lat: float, lon: float) -> tuple[float, float]:
    """The MERRA-2 grid node (latitude, longitude) nearest to a point."""
    return snap(lat, GRID_LAT_DEG), snap(lon, GRID_LON_DEG)


def _parse(payload: dict[str, Any], lat: float, lon: float) -> PowerDaily:
    """Turn a raw POWER GeoJSON response into a ``PowerDaily``."""
    series: dict[str, dict[str, float]] = payload["properties"]["parameter"]
    keys = sorted(next(iter(series.values()))) if series else []
    return PowerDaily(
        lat=lat,
        lon=lon,
        days=[datetime.strptime(k, "%Y%m%d").date() for k in keys],
        values={
            name: [None if by_day[k] == FILL_VALUE else by_day[k] for k in keys]
            for name, by_day in series.items()
        },
    )


def daily_point(  # noqa: PLR0913 -- plan WP6 signature plus injectable client/cache
    lat: float,
    lon: float,
    start: date,
    end: date,
    params: tuple[str, ...] = DEFAULT_PARAMS,
    *,
    client: httpx.Client | None = None,
    cache_dir: Path | None = None,
) -> PowerDaily:
    """Fetch daily POWER data for the grid cell containing a point.

    The point is snapped to the nearest MERRA-2 node (0.5° lat x 0.625° lon)
    before both the request and the cache key. POWER itself returns the
    nearest node's data, so values are unchanged and nearby parcels share one
    cached response.

    Args:
        lat: Latitude in degrees.
        lon: Longitude in degrees.
        start: First day, inclusive.
        end: Last day, inclusive.
        params: POWER parameter names.
        client: HTTP client to use; a short-lived one is created if omitted.
        cache_dir: Cache root; defaults to ``Settings().cache_dir``.

    Returns:
        The daily series, with fill values mapped to ``None``.

    Raises:
        httpx.HTTPError: The request failed or POWER returned an error status.
    """
    slat, slon = grid_node(lat, lon)
    query = {
        "parameters": ",".join(params),
        "community": "AG",
        "latitude": slat,
        "longitude": slon,
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "format": "JSON",
    }

    def fetch() -> dict[str, Any]:
        if client is not None:
            response = client.get(POWER_URL, params=query, timeout=TIMEOUT_S)
        else:
            response = httpx.get(POWER_URL, params=query, timeout=TIMEOUT_S)
        response.raise_for_status()
        return response.json()

    payload = get_or_fetch("power", query, fetch, cache_dir)
    return _parse(payload, slat, slon)
