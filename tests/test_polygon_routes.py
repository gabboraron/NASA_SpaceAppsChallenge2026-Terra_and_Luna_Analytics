"""HTTP behaviour of the drawn-polygon routes and CORS (WP13), without any network."""

import asyncio
from collections.abc import Callable, Iterator
from datetime import date, timedelta
from typing import Any

import httpx
import pytest

from pollination import models as m
from pollination.api import app
from pollination.contract import latest_hls, power_daily
from pollination.nasa.power import PowerDaily

# A small square near the demo region, lon/lat.
SQUARE = {
    "type": "Polygon",
    "coordinates": [
        [[21.70, 47.80], [21.71, 47.80], [21.71, 47.81], [21.70, 47.81], [21.70, 47.80]]
    ],
}
HUGE = {
    "type": "Polygon",
    "coordinates": [
        [[21.0, 47.0], [23.0, 47.0], [23.0, 48.5], [21.0, 48.5], [21.0, 47.0]]
    ],
}


class PowerCalls:
    """A POWER fake that records its requests and serves a warm, calm March."""

    def __init__(self, fail: Exception | None = None) -> None:
        self.calls: list[tuple[float, float, date, date]] = []
        self.fail = fail

    def __call__(self, lat: float, lon: float, start: date, end: date) -> PowerDaily:
        self.calls.append((lat, lon, start, end))
        if self.fail is not None:
            raise self.fail
        days = [date(start.year, 3, 1) + timedelta(days=i) for i in range(3)]
        values: dict[str, list[float | None]] = {
            "T2M_MAX": [20.0] * 3,
            "T2M_MIN": [10.0] * 3,
            "PRECTOTCORR": [1.0] * 3,
            "WS2M": [3.0] * 3,
        }
        return PowerDaily(lat=lat, lon=lon, days=days, values=values)


@pytest.fixture(autouse=True)
def clean_overrides() -> Iterator[None]:
    """Every test starts without overrides and without Earthdata settings."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def no_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """No usable Earthdata token, whatever the developer's .env says."""
    monkeypatch.setenv("EARTHDATA_TOKEN", "")


def send(
    method: str, path: str, **kwargs: Any
) -> httpx.Response:  # httpx request options pass straight through
    """Call the app in-process."""

    async def go() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            return await c.request(method, path, **kwargs)

    return asyncio.run(go())


def use_power(fake: Callable[[float, float, date, date], PowerDaily]) -> None:
    """Serve POWER from a fake."""
    app.dependency_overrides[power_daily] = lambda: fake


def test_power_route_requests_the_polygon_centre_and_both_periods() -> None:
    """Season (from 1 Jan, like the timeline) and the 2015-2024 baseline, one node."""
    fake = PowerCalls()
    use_power(fake)
    response = send("POST", "/polygon/power", json=SQUARE)
    assert response.status_code == 200
    (lat, lon, start, end), (_, _, base_start, base_end) = fake.calls
    assert (lon, lat) == pytest.approx((21.705, 47.805), abs=1e-3)
    assert (start, end) == (date(2024, 1, 1), date(2024, 8, 31))
    assert (base_start, base_end) == (date(2015, 1, 1), date(2024, 12, 31))
    body = response.json()
    assert [p["gdd"] for p in body["gdd_series"]] == [10.0, 20.0, 30.0]  # base 5 C
    assert body["bee_flight_weather_days"]["value"] == 3


def test_power_route_takes_the_year_from_the_query() -> None:
    """The plan's year argument: 2022 is asked for, 2023 is not a demo season."""
    fake = PowerCalls()
    use_power(fake)
    assert send("POST", "/polygon/power?year=2022", json=SQUARE).status_code == 200
    assert fake.calls[0][2:] == (date(2022, 1, 1), date(2022, 8, 31))
    assert send("POST", "/polygon/power?year=2023", json=SQUARE).status_code == 422


def test_power_thresholds_come_from_the_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Base temperature, flight temperature and wind limit are configuration."""
    use_power(PowerCalls())
    monkeypatch.setenv("GDD_BASE_TEMP_C", "15")
    monkeypatch.setenv("BEE_FLIGHT_MIN_TMAX_C", "25")
    body = send("POST", "/polygon/power", json=SQUARE).json()
    assert [p["gdd"] for p in body["gdd_series"]] == [0.0, 0.0, 0.0]  # mean 15 C
    assert body["bee_flight_weather_days"]["value"] == 0  # Tmax 20 < 25
    monkeypatch.setenv("BEE_FLIGHT_MIN_TMAX_C", "15")
    monkeypatch.setenv("BEE_FLIGHT_MAX_WIND_MS", "2")
    body = send("POST", "/polygon/power", json=SQUARE).json()
    assert body["bee_flight_weather_days"]["value"] == 0  # wind 3 >= 2


def test_power_failure_is_a_missing_value_not_a_server_error() -> None:
    """NASA being down must not break the page: 200 and a reason."""
    use_power(PowerCalls(fail=httpx.ConnectError("offline")))
    response = send("POST", "/polygon/power", json=SQUARE)
    assert response.status_code == 200
    body = response.json()
    assert body["gdd_series"] == []
    assert body["precipitation_total_mm"]["provenance"]["kind"] == "Missing"
    assert "ConnectError" in body["precipitation_total_mm"]["provenance"]["note"]


def test_hls_route_without_a_token_says_why(no_token: None) -> None:
    """No Earthdata token: Missing with the reason, and no NASA call."""
    calls: list[m.Polygon] = []

    def latest(polygon: m.Polygon) -> m.HlsResponse:
        calls.append(polygon)
        raise AssertionError("must not be called without a token")

    app.dependency_overrides[latest_hls] = lambda: latest
    body = send("POST", "/polygon/hls", json=SQUARE).json()
    assert body["observed_at"] is None
    assert body["ndvi"]["provenance"]["kind"] == "Missing"
    assert "token" in body["ndvi"]["provenance"]["note"]
    assert not calls


def test_hls_route_returns_the_latest_scene_with_a_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With a token the route returns what the HLS client found."""
    monkeypatch.setenv("EARTHDATA_TOKEN", "test-token")
    found = m.HlsResponse(
        observed_at=date(2026, 11, 10),
        ndvi=m.Measurement(
            value=0.42,
            provenance=m.Provenance(kind="Observed", source="hls", observed_at=None),
        ),
        ndyi=m.Measurement(
            value=0.1,
            provenance=m.Provenance(kind="Observed", source="hls", observed_at=None),
        ),
    )

    def serve(polygon: m.Polygon) -> m.HlsResponse:
        return found

    app.dependency_overrides[latest_hls] = lambda: serve
    body = send("POST", "/polygon/hls", json=SQUARE).json()
    assert body["observed_at"] == "2026-11-10"
    assert body["ndvi"]["value"] == 0.42


def test_hls_failure_is_a_missing_value(monkeypatch: pytest.MonkeyPatch) -> None:
    """A NASA error becomes a reason, so the map keeps working."""
    monkeypatch.setenv("EARTHDATA_TOKEN", "test-token")

    def broken(polygon: m.Polygon) -> m.HlsResponse:
        raise RuntimeError("CMR down")

    app.dependency_overrides[latest_hls] = lambda: broken
    response = send("POST", "/polygon/hls", json=SQUARE)
    assert response.status_code == 200
    assert "RuntimeError" in response.json()["ndvi"]["provenance"]["note"]


def test_hls_refuses_a_polygon_far_bigger_than_a_field(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A country-sized polygon would read gigabytes: Missing with the reason."""
    monkeypatch.setenv("EARTHDATA_TOKEN", "test-token")
    app.dependency_overrides[latest_hls] = lambda: pytest.fail  # never reached
    body = send("POST", "/polygon/hls", json=HUGE).json()
    assert body["ndvi"]["provenance"]["kind"] == "Missing"
    assert "too large" in body["ndvi"]["provenance"]["note"]


def test_cors_allows_the_vite_dev_origin_only() -> None:
    """The frontend dev server may call the API directly; other origins may not."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }
    allowed = send("OPTIONS", "/polygon/hls", headers=headers)
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    other = send(
        "OPTIONS", "/polygon/hls", headers={**headers, "Origin": "http://evil.example"}
    )
    assert "access-control-allow-origin" not in other.headers
