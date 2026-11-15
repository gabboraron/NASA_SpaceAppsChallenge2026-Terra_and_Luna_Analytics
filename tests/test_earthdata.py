"""earthaccess calls cannot hang forever on a dead network (WP23)."""

from collections.abc import Iterator
from threading import Event

import pytest

from pollination.nasa import earthdata
from pollination.nasa.failure import reason


@pytest.fixture
def hanging(monkeypatch: pytest.MonkeyPatch) -> Iterator[Event]:
    """earthaccess login and search that wait until released, as with requests
    on a network that accepts connections and never answers."""
    release = Event()

    def hang(*args: object, **kwargs: object) -> list[object]:
        release.wait()
        return []

    monkeypatch.setattr(earthdata, "EARTHACCESS_DEADLINE_S", 0.05)
    monkeypatch.setattr(earthdata.earthaccess, "login", hang)
    monkeypatch.setattr(earthdata.earthaccess, "search_data", hang)
    earthdata._login.cache_clear()  # pyright: ignore[reportPrivateUsage]  # fresh login
    yield release
    release.set()
    earthdata._login.cache_clear()  # pyright: ignore[reportPrivateUsage]  # no fake login left


def test_a_hanging_login_gives_up(hanging: Event) -> None:
    with pytest.raises(TimeoutError) as caught:
        earthdata.login()
    assert reason("HLS", caught.value) == "NASA HLS did not answer in time"


def test_a_hanging_search_gives_up(hanging: Event) -> None:
    with pytest.raises(TimeoutError):
        earthdata.search(short_name="HLSS30")


def test_search_passes_the_query_through(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    def search_data(**query: object) -> list[str]:
        seen.update(query)
        return ["granule"]

    monkeypatch.setattr(earthdata.earthaccess, "search_data", search_data)
    assert earthdata.search(short_name="SPL4SMGP", count=3) == ["granule"]
    assert seen == {"short_name": "SPL4SMGP", "count": 3}
