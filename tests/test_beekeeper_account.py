"""A signed-in beekeeper: own-profile matches, own costs and an own parcel's bloom."""

import asyncio
import math
from collections.abc import Iterator
from datetime import date, timedelta
from typing import Any

import httpx
import pytest

from pollination import models as m
from pollination.api import app
from pollination.config import Settings
from pollination.contract import own_power, season_inputs
from pollination.datafiles import load_catalog
from pollination.engine.calculator import OWN_COSTS, OWN_PROFILE, prefill
from pollination.engine.matching import match
from pollination.engine.timeline import SeasonInputs, parcel_weeks
from pollination.geo import area_ha, haversine_km
from pollination.nasa.power import PowerDaily

HOME = [21.75, 47.79]
PROFILE: dict[str, Any] = {
    "home": HOME,
    "colonies": 50,
    "max_distance_km": 60,
    "availability": {"start": "2024-04-01", "end": "2024-08-31"},
    "vehicle_l_per_100km": 9.5,
    "alternative_contribution_eur": 120,
}
# About 300 m x 330 m at this latitude.
SQUARE = {
    "type": "Polygon",
    "coordinates": [
        [
            [21.748, 47.789],
            [21.752, 47.789],
            [21.752, 47.792],
            [21.748, 47.792],
            [21.748, 47.789],
        ]
    ],
}
HUGE = {
    "type": "Polygon",
    "coordinates": [
        [[21.0, 47.0], [23.0, 47.0], [23.0, 48.5], [21.0, 48.5], [21.0, 47.0]]
    ],
}


def warm_season(year: int, parcel: m.Parcel) -> PowerDaily:
    """A temperate year from the previous September: coldest in January (-2 °C)."""
    start = date(year - 1, 9, 1)
    days = [start + timedelta(days=i) for i in range((date(year, 8, 31) - start).days)]
    mean = [
        10 + 12 * math.cos(2 * math.pi * (d.timetuple().tm_yday - 200) / 365)
        for d in days
    ]
    return PowerDaily(
        lat=47.5,
        lon=21.875,
        days=days,
        values={"T2M_MAX": [t + 5 for t in mean], "T2M_MIN": [t - 5 for t in mean]},
    )


def no_power(year: int, parcel: m.Parcel) -> str:
    """POWER unreachable: the reason, as ``parcel_power`` returns it."""
    return "POWER could not be reached"


def offline(year: int) -> SeasonInputs:
    """No HLS and no SMAP: the routes must still answer."""
    return SeasonInputs(power={}, hls="offline test", smap=f"offline {year}")


@pytest.fixture(autouse=True)
def no_nasa() -> Iterator[None]:
    app.dependency_overrides[season_inputs] = offline
    app.dependency_overrides[own_power] = lambda: warm_season
    yield
    app.dependency_overrides.clear()


def send(method: str, path: str, **kwargs: Any) -> httpx.Response:  # httpx options
    """Call the app in-process."""

    async def go() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            return await c.request(method, path, **kwargs)

    return asyncio.run(go())


def my_matches(profile: dict[str, Any], week: int = 9) -> list[dict[str, Any]]:
    response = send(
        "POST", "/matches", params={"year": 2024, "week": week}, json=profile
    )
    assert response.status_code == 200, response.text
    return response.json()


# --- POST /matches -------------------------------------------------------------


def test_own_matches_cover_every_listed_parcel_of_both_service_types() -> None:
    parcels = {p["id"]: p for p in send("GET", "/parcels").json()}
    cards = my_matches(PROFILE)
    assert {c["parcel_id"] for c in cards} == set(parcels)
    services = {parcels[c["parcel_id"]]["service_type"] for c in cards}
    assert services == {"pollination", "forage"}
    assert {c["beekeeper_id"] for c in cards} == {"you"}
    open_ = [c for c in cards if not c["blocked"]]
    assert [c["rank"] for c in open_] == list(range(1, len(open_) + 1))
    assert cards[: len(open_)] == open_


def test_own_matches_measure_distance_from_the_beekeepers_home() -> None:
    parcels = {p.id: p for p in load_catalog(Settings()).parcels}
    for card in my_matches(PROFILE):
        ring = parcels[card["parcel_id"]].geometry.coordinates[0]
        nearest = min(haversine_km((HOME[0], HOME[1]), point) for point in ring)
        # Road distance is the straight line to the centroid x 1.3.
        assert card["distance_km"]["value"] >= nearest * 1.3 - 1e-6
        assert card["distance_km"]["value"] <= (nearest + 2.0) * 1.3


def test_moving_home_changes_the_distances_and_blocks_far_parcels() -> None:
    near = {c["parcel_id"]: c for c in my_matches(PROFILE)}
    far = {c["parcel_id"]: c for c in my_matches({**PROFILE, "home": [19.0, 47.5]})}
    assert all(
        far[i]["distance_km"]["value"] > near[i]["distance_km"]["value"] + 100
        for i in near
    )
    assert all(c["blocked"] for c in far.values())
    assert any("60 km limit" in r for c in far.values() for r in c["reasons"])


def test_own_costs_prefill_the_calculator_and_are_reported() -> None:
    costs = {"fuel_price_per_l": 2.1, "hourly_labor_cost": 22, "legs": 2}
    plain = next(c for c in my_matches(PROFILE) if c["calculator_input"])
    mine = next(
        c
        for c in my_matches({**PROFILE, "costs": costs})
        if c["parcel_id"] == plain["parcel_id"]
    )
    before, after = plain["calculator_input"], mine["calculator_input"]
    assert (after["fuel_price_per_l"], after["hourly_labor_cost"], after["legs"]) == (
        2.1,
        22,
        2,
    )
    assert after["vehicle_cost_per_km"] == before["vehicle_cost_per_km"]
    assert after["fuel_l_per_100km"] == 9.5
    assert after["alternative_contribution"] == 120
    # Half the trips: half the driving time.
    assert after["driving_hours"] == pytest.approx(before["driving_hours"] / 2)
    for field in costs:
        assert after["provenance"][field]["kind"] == "Reported"
        assert after["provenance"][field]["source"] == OWN_COSTS
        assert before["provenance"][field]["kind"] == "Estimated"
    assert after["provenance"]["vehicle_cost_per_km"]["kind"] == "Estimated"
    assert after["provenance"]["fuel_l_per_100km"]["source"] == OWN_PROFILE
    assert "synthetic" not in str(after["provenance"])


def test_own_costs_change_the_calculated_result() -> None:
    def base(costs: dict[str, float]) -> dict[str, float]:
        card = next(
            c for c in my_matches({**PROFILE, "costs": costs}) if c["calculator_input"]
        )
        result = send("POST", "/calculate", json=card["calculator_input"])
        assert result.status_code == 200
        return result.json()["base"]

    cheap, dear = base({"fuel_price_per_l": 1.0}), base({"fuel_price_per_l": 3.0})
    assert dear["transport_cost"] > cheap["transport_cost"]
    assert dear["benefit_vs_alternative"] < cheap["benefit_vs_alternative"]


@pytest.mark.parametrize(
    "bad",
    [
        {"colonies": -1},
        {"home": [200, 47]},
        {"costs": {"fuel_price_per_l": -1}},
        {"costs": {"average_speed_kmh": 0}},
        {"availability": {"start": "soon", "end": "2024-08-31"}},
    ],
)
def test_own_matches_refuse_an_invalid_profile(bad: dict[str, Any]) -> None:
    response = send(
        "POST", "/matches", params={"year": 2024, "week": 9}, json={**PROFILE, **bad}
    )
    assert response.status_code == 422


def test_own_matches_refuse_an_unknown_week() -> None:
    params = {"year": 2024, "week": 27}
    assert send("POST", "/matches", params=params, json=PROFILE).status_code == 422


def test_calculator_defaults_are_the_shipped_ones() -> None:
    defaults = send("GET", "/calculator/defaults").json()
    assert (
        defaults["fuel_price_per_l"]
        == load_catalog(Settings()).calculator.fuel_price_per_l
    )
    assert {"legs", "average_speed_kmh", "hourly_labor_cost", "source"} <= set(defaults)


# --- engine ----------------------------------------------------------------------


def test_prefill_keeps_the_synthetic_wording_and_defaults_without_costs() -> None:
    data = load_catalog(Settings())
    keeper, parcel = data.actors.beekeepers[0], data.parcels[0]
    plain = prefill(keeper, parcel, data.calculator)
    assert plain == prefill(keeper, parcel, data.calculator, m.CostSettings())
    assert "synthetic" in plain.provenance["fuel_l_per_100km"].source
    fast = prefill(
        keeper, parcel, data.calculator, m.CostSettings(average_speed_kmh=120)
    )
    assert fast.driving_hours == pytest.approx(
        plain.driving_hours * data.calculator.average_speed_kmh / 120
    )
    assert fast.provenance["driving_hours"].note == "Your average speed"


def test_match_services_default_to_the_beekeepers_goal() -> None:
    data = load_catalog(Settings())
    keeper = data.actors.beekeepers[0]
    inputs = offline(2024)
    weeks = {
        p.id: parcel_weeks(
            p,
            data.phenology.get(p.crop),
            2024,
            power="offline",
            observations="offline",
            smap=inputs.smap,
        )[8]
        for p in data.parcels
    }
    by_goal = match(keeper, data.parcels, weeks, data.calculator, data.ranking)
    both = match(
        keeper,
        data.parcels,
        weeks,
        data.calculator,
        data.ranking,
        services=("pollination", "forage"),
    )
    kinds = {p.id: p.service_type for p in data.parcels}
    assert {kinds[c.parcel_id] for c in by_goal} == {keeper.goal}
    assert len(both) == len(data.parcels)


# --- POST /polygon/timeline ------------------------------------------------------


def own_timeline(
    crop: str, year: int = 2024, **extra: Any
) -> dict[str, Any]:  # extra request fields
    body = {"id": "own-1", "crop": crop, "geometry": SQUARE, **extra}
    response = send("POST", "/polygon/timeline", params={"year": year}, json=body)
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize("crop", ["black_locust", "apple", "sour_cherry"])
def test_an_own_tree_parcel_gets_a_bloom_window_from_power(crop: str) -> None:
    answer = own_timeline(crop)
    weeks = answer["weeks"]
    assert [w["week"] for w in weeks] == list(range(1, 27))
    assert {w["parcel_id"] for w in weeks} == {"own-1"}
    states = [w["bloom_state"] for w in weeks]
    assert "blooming" in states
    # Before, during, after: in that order and nothing else.
    order = [s for i, s in enumerate(states) if i == 0 or s != states[i - 1]]
    assert order == [s for s in ("pre_bloom", "blooming", "post_bloom") if s in order]
    blooming = next(w for w in weeks if w["bloom_state"] == "blooming")
    assert blooming["bloom_provenance"]["kind"] == "Estimated"
    assert "NASA POWER" in blooming["bloom_provenance"]["source"]
    window = blooming["estimated_bloom"]
    assert window and window["start"].startswith("2024")
    assert blooming["gdd"]["value"] is not None


def test_an_own_parcel_is_described_from_its_geometry_not_invented() -> None:
    parcel = own_timeline("black_locust", irrigated=True)["parcel"]
    assert parcel["id"] == "own-1"
    assert parcel["illustrative"] is False
    assert parcel["irrigated"] is True
    assert parcel["geometry"] == SQUARE
    # 0.004 deg lon x 0.003 deg lat at 47.79 N is about 299 m x 334 m.
    assert parcel["area_ha"] == pytest.approx(10.0, abs=0.3)
    assert parcel["natura_status"] in {"inside", "buffer_overlap", "clear"}


def test_own_bloom_moves_with_the_season_requested() -> None:
    first = own_timeline("black_locust", 2022)["weeks"][0]
    assert first["starts_on"] == "2022-03-01"


def test_without_power_an_own_parcel_falls_back_to_the_declared_window() -> None:
    app.dependency_overrides[own_power] = lambda: no_power
    declared = {"start": "2024-05-10", "end": "2024-05-24"}
    weeks = own_timeline("black_locust", declared_bloom=declared)["weeks"]
    blooming = [w for w in weeks if w["bloom_state"] == "blooming"]
    assert blooming
    assert all(w["bloom_provenance"]["kind"] == "Reported" for w in blooming)
    assert "POWER could not be reached" in blooming[0]["bloom_provenance"]["note"]
    assert all(w["gdd"]["provenance"]["kind"] == "Missing" for w in weeks)
    # No declaration either: an explained gap, never a made-up bloom.
    bare = own_timeline("black_locust")["weeks"]
    assert {w["bloom_state"] for w in bare} == {"none"}
    assert {w["bloom_provenance"]["kind"] for w in bare} == {"Missing"}


def test_an_own_sunflower_parcel_uses_the_declared_window_and_says_why() -> None:
    declared = {"start": "2024-07-05", "end": "2024-07-30"}
    weeks = own_timeline("sunflower", declared_bloom=declared)["weeks"]
    blooming = [w for w in weeks if w["bloom_state"] == "blooming"]
    assert blooming and blooming[0]["bloom_provenance"]["kind"] == "Reported"
    assert weeks[0]["ndyi"]["value"] is None
    assert "listed parcels only" in weeks[0]["ndyi"]["provenance"]["note"]
    # SMAP is offline in this test: nectar is unknown, with the reason.
    assert {w["nectar_state"] for w in weeks} == {"unknown"}


def test_an_own_parcel_of_an_unmodelled_crop_is_declared_or_missing() -> None:
    weeks = own_timeline("lavender")["weeks"]
    assert {w["bloom_provenance"]["kind"] for w in weeks} == {"Missing"}
    assert "No bloom model for lavender" in weeks[0]["bloom_provenance"]["note"]


def test_an_own_parcel_works_far_from_the_demo_region() -> None:
    far = {
        "type": "Polygon",
        "coordinates": [
            [
                [-93.5, 41.9],
                [-93.496, 41.9],
                [-93.496, 41.903],
                [-93.5, 41.903],
                [-93.5, 41.9],
            ]
        ],
    }
    answer = own_timeline("apple", geometry=far)
    assert any(w["bloom_state"] == "blooming" for w in answer["weeks"])
    assert answer["parcel"]["natura_status"] == "clear"


@pytest.mark.parametrize(
    ("geometry", "status"),
    [
        (HUGE, 422),
        ({"type": "Polygon", "coordinates": [[[1, 1], [1, 1], [1, 1], [1, 1]]]}, 422),
        ({"type": "Polygon", "coordinates": [[[1, 1], [2, 2], [3, 3]]]}, 422),
        ({"type": "Point", "coordinates": [1, 1]}, 422),
    ],
)
def test_own_timeline_refuses_a_bad_polygon(geometry: Any, status: int) -> None:
    body = {"id": "own-1", "crop": "apple", "geometry": geometry}
    response = send("POST", "/polygon/timeline", params={"year": 2024}, json=body)
    assert response.status_code == status


def test_own_timeline_refuses_an_unknown_season() -> None:
    body = {"id": "own-1", "crop": "apple", "geometry": SQUARE}
    response = send("POST", "/polygon/timeline", params={"year": 1999}, json=body)
    assert response.status_code == 422


def test_area_of_a_known_square() -> None:
    polygon = m.Polygon.model_validate(SQUARE)
    assert area_ha(polygon) == pytest.approx(10.0, abs=0.3)
