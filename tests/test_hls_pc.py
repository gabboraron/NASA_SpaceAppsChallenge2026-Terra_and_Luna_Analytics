"""Planetary Computer mirror of HLS: search, read tokens, tiles and fallback."""

import json
from datetime import date

import pytest
from pytest_httpx import HTTPXMock

from pollination import contract
from pollination.nasa import hls_live, hls_pc
from pollination.nasa.hls import Scene

BBOX = (21.6, 47.7, 22.4, 48.05)
DAYS = (date(2024, 7, 8), date(2024, 7, 14))
S30 = "HLS.S30.T34UEU.2024190T092549.v2.0"
L30 = "HLS.L30.T34UEU.2024191T092627.v2.0"
BLOB = "https://hls2euwest.blob.core.windows.net/hls2"


def item(sid: str, collection: str, bands: list[str]) -> dict[str, object]:
    return {
        "id": sid,
        "collection": collection,
        "properties": {"eo:cloud_cover": 12.0},
        "assets": {b: {"href": f"{BLOB}/{sid}.{b}.tif"} for b in bands},
    }


def test_search_follows_pages_and_maps_the_nir_band(httpx_mock: HTTPXMock) -> None:
    common = ["B02", "B03", "B04", "Fmask"]
    following = {"rel": "next", "href": "https://next.example/search", "body": {"p": 2}}
    httpx_mock.add_response(
        json={
            "features": [item(S30, "hls2-s30", [*common, "B8A"])],
            "links": [following],
        }
    )
    httpx_mock.add_response(
        url="https://next.example/search",
        json={
            "features": [
                item(L30, "hls2-l30", [*common, "B05"]),
                item("HLS.L30.T34UEU.2024192T092627.v2.0", "hls2-l30", common),
            ],
            "links": [],
        },
    )
    scenes = hls_pc.search_scenes(BBOX, *DAYS)
    assert [s.id for s in scenes] == [S30, L30]  # the one without NIR is dropped
    assert scenes[0].day == date(2024, 7, 8)
    assert scenes[0].cloud == 12.0  # the fixture's cloud cover
    assert scenes[0].urls["nir"].endswith(".B8A.tif")
    assert scenes[1].urls["nir"].endswith(".B05.tif")
    first, second = httpx_mock.get_requests()
    assert json.loads(first.content)["datetime"] == (
        "2024-07-08T00:00:00Z/2024-07-14T23:59:59Z"
    )
    assert json.loads(second.content) == {"p": 2}


def test_sign_fetches_one_token_per_container(
    httpx_mock: HTTPXMock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(hls_pc, "_tokens", {})
    httpx_mock.add_response(
        url="https://planetarycomputer.microsoft.com/api/sas/v1/token/hls2euwest/hls2",
        json={"token": "sig=abc", "msft:expiry": "2999-01-01T00:00:00Z"},
    )
    assert hls_pc.sign(f"{BLOB}/a.tif") == f"{BLOB}/a.tif?sig=abc"
    assert hls_pc.sign(f"{BLOB}/b.tif") == f"{BLOB}/b.tif?sig=abc"
    assert len(httpx_mock.get_requests()) == 1


def test_only_mirror_urls_are_signed() -> None:
    assert hls_pc.is_mirror(f"{BLOB}/a.tif")
    assert not hls_pc.is_mirror("https://data.lpdaac.earthdatacloud.nasa.gov/a.tif")


@pytest.mark.parametrize(
    ("mirror", "token", "expected"),
    [
        ("found", "", "mirror"),
        ("empty", "", "mirror"),  # nothing to fall back to
        ("empty", "t", "nasa"),
        ("down", "t", "nasa"),
    ],
)
def test_search_falls_back_to_nasa_only_with_a_token(
    monkeypatch: pytest.MonkeyPatch, mirror: str, token: str, expected: str
) -> None:
    monkeypatch.setenv("PLANETARY_COMPUTER", "true")
    monkeypatch.setenv("EARTHDATA_TOKEN", token)
    found = [Scene("m", DAYS[0], {})]

    def on_mirror(*_: object) -> list[Scene]:
        if mirror == "down":
            raise RuntimeError("mirror down")
        return found if mirror == "found" else []

    nasa = [Scene("n", DAYS[0], {})]

    def at_nasa(*_: object) -> list[Scene]:
        return nasa

    monkeypatch.setattr(hls_pc, "search_scenes", on_mirror)
    monkeypatch.setattr(hls_live, "search_scenes", at_nasa)
    got = hls_live.search_any(BBOX, *DAYS)
    assert got == (nasa if expected == "nasa" else on_mirror())


def test_mirror_failure_without_a_token_is_raised(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PLANETARY_COMPUTER", "true")

    def down(*_: object) -> list[Scene]:
        raise RuntimeError("mirror down")

    monkeypatch.setattr(hls_pc, "search_scenes", down)
    with pytest.raises(RuntimeError, match="mirror down"):
        hls_live.search_any(BBOX, *DAYS)


@pytest.fixture
def mirror_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PLANETARY_COMPUTER", "true")
    monkeypatch.setattr(hls_pc, "_tiles", {})


@pytest.mark.usefixtures("mirror_on")
def test_imagery_route_gives_week_tiles(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(json={"searchid": "pc1.1.abc"})
    body = contract.hls_imagery(2024, 20)
    assert body.tiles is not None
    assert "/mosaic/pc1.1.abc/tiles/WebMercatorQuad/{z}/{x}/{y}?" in body.tiles
    assert body.provenance.kind == "Observed"
    assert contract.hls_imagery(2024, 20) == body  # reused, not registered twice
    (request,) = httpx_mock.get_requests()
    assert json.loads(request.content)["datetime"] == (
        "2024-07-12T00:00:00Z/2024-07-18T23:59:59Z"
    )


@pytest.mark.usefixtures("mirror_on")
def test_imagery_route_explains_a_failure(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(status_code=503)
    body = contract.hls_imagery(2024, 21)
    assert body.tiles is None
    assert body.provenance.kind == "Missing"
    assert "mirror did not answer" in body.provenance.note


def test_imagery_route_is_missing_when_the_mirror_is_off() -> None:
    body = contract.hls_imagery(2024, 3)
    assert body.tiles is None
    assert body.provenance.kind == "Missing"
