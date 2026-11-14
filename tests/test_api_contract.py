"""Check the public WP2 contract through its HTTP entry points."""

import asyncio
from collections.abc import Iterator
from typing import Any

import httpx
import pytest

from pollination import models as m
from pollination import state
from pollination.api import app
from pollination.contract import season_inputs
from pollination.engine.timeline import SeasonInputs


def offline(year: m.Season) -> SeasonInputs:
    """Every NASA source missing: the contract must still hold, without network."""
    return SeasonInputs(power={}, hls="offline test", smap=f"offline {year}")


@pytest.fixture(autouse=True)
def no_nasa() -> Iterator[None]:
    app.dependency_overrides[season_inputs] = offline
    yield
    app.dependency_overrides.clear()
    state.verifications.clear()


def test_contract_click_path() -> None:

    async def exercise() -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            paths = (await client.get("/openapi.json")).json()["paths"]
            expected = {
                "/actors",
                "/parcels",
                "/natura2000",
                "/timeline",
                "/matches",
                "/calculate",
                "/parcels/{id}/verify",
                "/polygon/power",
                "/polygon/hls",
            }
            assert expected <= paths.keys()
            parcel = (await client.get("/parcels")).json()[0]
            actors = (await client.get("/actors")).json()
            assert (await client.get("/natura2000")).json()[
                "type"
            ] == "FeatureCollection"
            for year in (2022, 2024):
                timeline = (await client.get("/timeline", params={"year": year})).json()
                assert timeline["year"] == year
                assert timeline["parcel_weeks"][0]["parcel_id"] == parcel["id"]
                assert len(timeline["parcel_weeks"]) == 26 * len(
                    (await client.get("/parcels")).json()
                )
            params = {
                "beekeeper_id": actors["beekeepers"][0]["id"],
                "year": 2024,
                "week": 26,
            }
            card = (await client.get("/matches", params=params)).json()[0]
            calc = await client.post("/calculate", json=card["calculator_input"])
            assert {"low", "base", "high"} <= calc.json().keys()
            verify = await client.post(f"/parcels/{parcel['id']}/verify")
            assert verify.json()["kind"] == "Observed"
            for endpoint in ("/polygon/power", "/polygon/hls"):
                response = await client.post(endpoint, json=parcel["geometry"])
                assert response.status_code == 200
                invalid = await client.post(
                    endpoint, json={"type": "Point", "coordinates": []}
                )
                assert invalid.status_code == 422
            assert (await client.get("/timeline?year=2023")).status_code == 422
            assert (
                await client.get("/matches", params={**params, "week": 0})
            ).status_code == 422
            assert (await client.post("/calculate", json={})).status_code == 422
            assert (await client.post("/parcels/absent/verify")).status_code == 404

    asyncio.run(exercise())


def test_verification_marks_blooming_weeks_observed() -> None:
    """A simulated field photo turns the parcel's blooming weeks Observed."""

    async def exercise() -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            parcel = (await client.get("/parcels")).json()[0]["id"]

            async def blooming() -> list[dict[str, str]]:
                timeline = (await client.get("/timeline?year=2024")).json()
                return [
                    w["bloom_provenance"]
                    for w in timeline["parcel_weeks"]
                    if w["parcel_id"] == parcel and w["bloom_state"] == "blooming"
                ]

            before = await blooming()
            assert before
            assert all(p["kind"] != "Observed" for p in before)
            assert (await client.post(f"/parcels/{parcel}/verify")).status_code == 200
            assert all(p["kind"] == "Observed" for p in await blooming())

    asyncio.run(exercise())


def test_matches_rank_the_parcels_of_the_beekeepers_goal() -> None:
    """One card per parcel of the goal: open ones ranked by the engine, blocked last."""

    async def exercise() -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:

            async def cards(beekeeper: str) -> list[dict[str, Any]]:
                params = {"beekeeper_id": beekeeper, "year": 2024, "week": 9}
                return (await client.get("/matches", params=params)).json()

            b1, b2, b3 = await cards("B1"), await cards("B2"), await cards("B3")
            parcels = {p["id"]: p for p in (await client.get("/parcels")).json()}
            assert {parcels[c["parcel_id"]]["service_type"] for c in b1} == {
                "pollination"
            }
            assert {parcels[c["parcel_id"]]["service_type"] for c in b3} == {"forage"}
            open_b1 = [c for c in b1 if not c["blocked"]]
            assert [c["rank"] for c in open_b1] == list(range(1, len(open_b1) + 1))
            assert parcels[open_b1[0]["parcel_id"]]["crop"] in {"apple", "sour_cherry"}
            assert "Blooming in the selected week" in open_b1[0]["reasons"]
            assert b1[: len(open_b1)] == open_b1
            params = {"beekeeper_id": "B1", "year": 2024, "week": 26}
            late = (await client.get("/matches", params=params)).json()
            assert "Blooming in the selected week" not in late[0]["reasons"]
            for card in b3:
                inside = parcels[card["parcel_id"]]["natura_status"] == "inside"
                assert card["blocked"] is inside
                assert (card["calculator_input"] is None) is inside
                assert (card["rank"] is None) is inside
            far = next(c for c in b2 if c["parcel_id"] == "P03")
            result = await client.post("/calculate", json=far["calculator_input"])
            assert result.json()["verdict"] == "do_not_move"
            assert await cards("nobody") == []

    asyncio.run(exercise())
