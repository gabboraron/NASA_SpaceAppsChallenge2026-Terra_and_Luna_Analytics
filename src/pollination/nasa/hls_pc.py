"""NASA HLS v2.0 from its mirror on the Microsoft Planetary Computer.

The mirror holds the same granules (same ids, same cloud-optimised GeoTIFFs) as
NASA's LP DAAC from 2020 on, and answers without an Earthdata login: a STAC
search, one short-lived read token per storage container, and ready-made map
tiles. Checked live: a season's search takes about a second and a parcel's five
bands about 1.5 s.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from threading import Lock
from time import monotonic
from typing import Any
from urllib.parse import urlsplit

import httpx

from pollination.geo import Bbox
from pollination.nasa.hls import Scene, scene_day

SOURCE = "NASA HLS S30 v2.0 via Microsoft Planetary Computer"
_API = "https://planetarycomputer.microsoft.com/api"
_MIRROR_HOST = ".blob.core.windows.net"
HTTP_TIMEOUT_S = 30
MAX_SCENE_CLOUD_PERCENT = 80  # coarse pre-filter; the parcel mask decides
START_YEAR = 2020  # the mirror holds nothing older
_PAGE = 250
_TOKEN_MARGIN = timedelta(minutes=5)
# NIR asset per collection; the other bands share their names.
_NIR = {"hls2-s30": "B8A", "hls2-l30": "B05"}
COMMON_BANDS = {"blue": "B02", "green": "B03", "red": "B04", "fmask": "Fmask"}
# True colour (red, green, blue) stretched over 0 to 0.3 reflectance.
_TRUE_COLOUR = "collection=hls2-s30&assets=B04&assets=B03&assets=B02&rescale=0,3000"

# A week's tile address lasts about a day at the mirror; ours is reused for half.
_TILES_TTL_S = 12 * 3600.0

# One connection pool for every request; failed connections are retried.
_CLIENT = httpx.Client(timeout=HTTP_TIMEOUT_S, transport=httpx.HTTPTransport(retries=2))
_tokens: dict[str, tuple[str, datetime]] = {}
_tokens_lock = Lock()
_tiles: dict[tuple[date, date], tuple[str, float]] = {}
_tiles_lock = Lock()


def _span(start: date, end: date) -> str:
    """Both days, inclusive, as a STAC datetime interval."""
    return f"{start.isoformat()}T00:00:00Z/{end.isoformat()}T23:59:59Z"


def search_scenes(bbox: Bbox, start: date, end: date) -> list[Scene]:
    """Find HLS S30 and L30 v2.0 granules intersecting ``bbox`` between two days.

    Args:
        bbox: West, south, east, north in degrees.
        start: First day, inclusive.
        end: Last day, inclusive.

    Returns:
        Scenes that have all five bands needed (blue, green, red, NIR, Fmask).

    Raises:
        httpx.HTTPError: The search failed.
    """
    url: str | None = f"{_API}/stac/v1/search"
    body: dict[str, Any] = {
        "collections": list(_NIR),
        "bbox": list(bbox),
        "datetime": _span(start, end),
        "limit": _PAGE,
        "query": {"eo:cloud_cover": {"lte": MAX_SCENE_CLOUD_PERCENT}},
    }
    scenes: list[Scene] = []
    while url:
        response = _CLIENT.post(url, json=body)
        response.raise_for_status()
        page = response.json()
        for item in page["features"]:
            bands = {**COMMON_BANDS, "nir": _NIR[item["collection"]]}
            assets = item["assets"]
            if all(band in assets for band in bands.values()):
                urls = {role: assets[band]["href"] for role, band in bands.items()}
                cloud = item["properties"].get("eo:cloud_cover")
                scenes.append(Scene(item["id"], scene_day(item["id"]), urls, cloud))
        following = next((x for x in page["links"] if x["rel"] == "next"), None)
        url = following and following["href"]
        body = following["body"] if following else body
    return scenes


def is_mirror(url: str) -> bool:
    """Whether a band URL points at the mirror (and not at NASA)."""
    return (urlsplit(url).hostname or "").endswith(_MIRROR_HOST)


def sign(url: str) -> str:
    """Add the mirror's read token to a band URL.

    One anonymous token covers a whole storage container for about an hour, so
    it is fetched once and reused until shortly before it expires.

    Args:
        url: Band URL on the mirror.

    Returns:
        The URL with the token as its query string.

    Raises:
        httpx.HTTPError: The token request failed.
    """
    parts = urlsplit(url)
    container = f"{(parts.hostname or '').split('.')[0]}/{parts.path.split('/')[1]}"
    with _tokens_lock:
        held = _tokens.get(container)
        if held is None or held[1] - datetime.now(UTC) < _TOKEN_MARGIN:
            response = _CLIENT.get(f"{_API}/sas/v1/token/{container}")
            response.raise_for_status()
            answer = response.json()
            held = (answer["token"], datetime.fromisoformat(answer["msft:expiry"]))
            _tokens[container] = held
    return f"{url}?{held[0]}"


def week_tiles(start: date, end: date) -> str:
    """Map tiles of the clearest Sentinel-2 passes between two days, in true colour.

    Args:
        start: First day, inclusive.
        end: Last day, inclusive.

    A period's address is registered once and reused while it is valid.

    Returns:
        An XYZ tile URL template (``{z}/{x}/{y}``).

    Raises:
        httpx.HTTPError: The mosaic could not be registered.
    """
    search = {
        "collections": ["hls2-s30"],  # the tile service takes one collection
        "datetime": _span(start, end),
        "query": {"eo:cloud_cover": {"lte": MAX_SCENE_CLOUD_PERCENT}},
        "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}],
    }
    with _tiles_lock:
        held = _tiles.get((start, end))
        if held is None or monotonic() - held[1] > _TILES_TTL_S:
            response = _CLIENT.post(f"{_API}/data/v1/mosaic/register", json=search)
            response.raise_for_status()
            tiles = (
                f"{_API}/data/v1/mosaic/{response.json()['searchid']}/tiles/"
                f"WebMercatorQuad/{{z}}/{{x}}/{{y}}?{_TRUE_COLOUR}&format=png"
            )
            held = _tiles[start, end] = (tiles, monotonic())
    return held[0]
