from datetime import date
from pathlib import Path

import httpx
import pytest
from pytest_httpx import HTTPXMock

from pollination.nasa.power import (
    GRID_LAT_DEG,
    GRID_LON_DEG,
    POWER_URL,
    daily_point,
    snap,
)

PAYLOAD = {
    "type": "Feature",
    "properties": {
        "parameter": {
            "T2M_MAX": {"20240102": 6.05, "20240101": 6.54},
            "T2M_MIN": {"20240101": 2.02, "20240102": -999.0},
        }
    },
}


@pytest.mark.parametrize(
    ("lat", "lon", "node"),
    [
        # Groupings observed against the live API on 2026-11-14.
        (47.70, 21.60, (47.5, 21.875)),
        (47.74, 21.95, (47.5, 21.875)),
        (47.90, 22.00, (48.0, 21.875)),
        (47.99, 22.20, (48.0, 22.5)),
        (48.00, 22.30, (48.0, 22.5)),
        (-0.10, -0.40, (0.0, -0.625)),
    ],
)
def test_snap_to_nearest_merra2_node(
    lat: float, lon: float, node: tuple[float, float]
) -> None:
    assert (snap(lat, GRID_LAT_DEG), snap(lon, GRID_LON_DEG)) == node


def test_daily_point_parses_and_maps_fill(
    httpx_mock: HTTPXMock, tmp_path: Path
) -> None:
    httpx_mock.add_response(json=PAYLOAD)

    result = daily_point(
        47.93, 22.01, date(2024, 1, 1), date(2024, 1, 2), cache_dir=tmp_path
    )

    assert (result.lat, result.lon) == (48.0, 21.875)
    assert result.days == [date(2024, 1, 1), date(2024, 1, 2)]
    assert result.values == {"T2M_MAX": [6.54, 6.05], "T2M_MIN": [2.02, None]}
    request = httpx_mock.get_request()
    assert request is not None
    assert str(request.url).startswith(POWER_URL)
    assert request.url.params["community"] == "AG"
    assert request.url.params["start"] == "20240101"
    assert request.url.params["latitude"] == "48.0"
    assert request.url.params["longitude"] == "21.875"


def test_nearby_points_share_cache(httpx_mock: HTTPXMock, tmp_path: Path) -> None:
    httpx_mock.add_response(json=PAYLOAD)
    args = (date(2024, 1, 1), date(2024, 1, 2))

    daily_point(47.80, 22.30, *args, cache_dir=tmp_path)
    daily_point(48.20, 22.70, *args, cache_dir=tmp_path)

    assert len(httpx_mock.get_requests()) == 1


def test_http_error_raises_and_is_not_cached(
    httpx_mock: HTTPXMock, tmp_path: Path
) -> None:
    httpx_mock.add_response(status_code=500)

    with pytest.raises(httpx.HTTPStatusError):
        daily_point(48.0, 22.0, date(2024, 1, 1), date(2024, 1, 2), cache_dir=tmp_path)

    assert not list(tmp_path.rglob("*.json"))
