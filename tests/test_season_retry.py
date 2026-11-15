"""Failed season inputs wait before the next NASA attempt (WP23)."""

from collections.abc import Callable, Iterator
from datetime import date
from pathlib import Path

import pytest
from fastapi import HTTPException

from pollination import contract
from pollination import models as m
from pollination.engine.timeline import SeasonInputs
from pollination.weeks import latest_season

YEAR = m.Season(2024)


class Clock:
    """A ``monotonic`` the test moves by hand."""

    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> Iterator[Clock]:
    """Fresh in-memory season state and a hand-driven clock."""
    monkeypatch.setattr(contract, "_inputs_by_year", {})
    monkeypatch.setattr(contract, "_timelines", {})
    fake = Clock()
    monkeypatch.setattr(contract, "monotonic", fake)
    yield fake


def fetches(monkeypatch: pytest.MonkeyPatch, *results: bool) -> list[SeasonInputs]:
    """Make ``fetch_inputs`` return inputs with these ``failed`` flags in turn."""
    made: list[SeasonInputs] = []
    queue = list(results)

    def fake(*args: object, **kwargs: object) -> SeasonInputs:
        made.append(SeasonInputs(power={}, hls="n/a", smap="n/a", failed=queue.pop(0)))
        return made[-1]

    monkeypatch.setattr(contract, "fetch_inputs", fake)
    return made


def test_failed_inputs_are_reused_until_the_retry_time(
    monkeypatch: pytest.MonkeyPatch, clock: Clock
) -> None:
    """With NASA down, slider moves do not each wait for the same timeouts."""
    made = fetches(monkeypatch, True, False)
    first = contract.season_inputs(YEAR)
    clock.now += contract.RETRY_FAILED_S - 1
    assert contract.season_inputs(YEAR) is first
    assert len(made) == 1
    clock.now += 2
    second = contract.season_inputs(YEAR)
    assert second is not first
    assert not second.failed
    assert len(made) == 2


def test_complete_inputs_are_kept_for_good(
    monkeypatch: pytest.MonkeyPatch, clock: Clock
) -> None:
    made = fetches(monkeypatch, False)
    first = contract.season_inputs(YEAR)
    clock.now += 10 * contract.RETRY_FAILED_S
    assert contract.season_inputs(YEAR) is first
    assert len(made) == 1


def test_the_timeline_of_failed_inputs_is_rebuilt_after_a_retry(
    monkeypatch: pytest.MonkeyPatch, clock: Clock
) -> None:
    """The cached timeline follows the inputs: a successful retry replaces it."""
    fetches(monkeypatch, True, False)
    built: list[SeasonInputs] = []

    def fake_build(
        year: int, parcels: object, phen: object, inputs: SeasonInputs, ver: object
    ) -> m.TimelineResponse:
        built.append(inputs)
        return m.TimelineResponse(year=YEAR, parcel_weeks=[], smap_cells=[])

    monkeypatch.setattr(contract, "build_timeline", fake_build)
    failed = contract.season_inputs(YEAR)
    contract.season_timeline(YEAR, failed)
    contract.season_timeline(YEAR, contract.season_inputs(YEAR))
    assert len(built) == 1  # still inside the retry time: cached
    clock.now += contract.RETRY_FAILED_S + 1
    contract.season_timeline(YEAR, contract.season_inputs(YEAR))
    assert len(built) == 2
    assert not built[-1].failed


def test_latest_season_starts_once_its_nasa_data_has_settled() -> None:
    assert latest_season(date(2026, 9, 14)) == 2025
    assert latest_season(date(2026, 9, 15)) == 2026
    assert latest_season(date(2027, 2, 1)) == 2026


def test_a_season_that_is_neither_shipped_nor_the_latest_is_refused() -> None:
    with pytest.raises(HTTPException) as caught:
        contract.season_inputs(2019)
    assert caught.value.status_code == 422


def test_the_latest_season_answers_with_power_then_gets_the_satellites(
    monkeypatch: pytest.MonkeyPatch, clock: Clock
) -> None:
    """With a token: POWER at once (pending), HLS and SMAP from a background fetch."""
    year = latest_season(date.today())
    monkeypatch.setenv("EARTHDATA_TOKEN", "token")
    running: set[int] = set()
    monkeypatch.setattr(contract, "_fetching", running)
    full = SeasonInputs(power={}, hls="n/a", smap="n/a")
    quick = SeasonInputs(power={}, hls="n/a", smap="n/a", pending=True)
    started: list[Callable[[], None]] = []

    class Later:
        """A thread the test runs by hand."""

        def __init__(
            self, target: Callable[[int], None], args: tuple[int], daemon: bool
        ) -> None:
            self.run = lambda: target(*args)

        def start(self) -> None:
            started.append(self.run)

    monkeypatch.setattr(contract, "fetch_inputs", lambda *a, **k: full)  # pyright: ignore[reportUnknownLambdaType, reportUnknownArgumentType]  # any arguments
    monkeypatch.setattr(contract, "pending_inputs", lambda *a: quick)  # pyright: ignore[reportUnknownLambdaType, reportUnknownArgumentType]  # any arguments
    monkeypatch.setattr(contract, "Thread", Later)

    first = contract.season_inputs(year)
    assert first is quick
    assert contract.season_inputs(year) is quick  # no second fetch while it runs
    assert len(started) == 1
    started[0]()
    assert contract.season_inputs(year) is full
    assert not running


def test_without_a_token_the_latest_season_is_fetched_in_one_go(
    monkeypatch: pytest.MonkeyPatch, clock: Clock
) -> None:
    """HLS and SMAP then only read the cache, which is quick."""
    made = fetches(monkeypatch, False)
    inputs = contract.season_inputs(latest_season(date.today()))
    assert inputs is made[0]
    assert not inputs.pending


def test_a_pending_timeline_says_how_far_the_satellite_fetch_has_got(
    monkeypatch: pytest.MonkeyPatch, clock: Clock, tmp_path: Path
) -> None:
    """Each source's (done, total) shows while it runs and is gone afterwards."""
    year = latest_season(date.today())
    monkeypatch.setenv("CACHE_DIR", str(tmp_path))
    full = SeasonInputs(power={}, hls="n/a", smap="n/a")
    pending = m.TimelineResponse(
        year=year, pending=True, parcel_weeks=[], smap_cells=[]
    )
    during: list[m.TimelineResponse] = []

    def fetch(
        _: int, *, satellites: bool, progress: Callable[[str, int, int], None]
    ) -> SeasonInputs:
        assert satellites
        progress("HLS", 3, 10)
        progress("SMAP", 1, 286)
        during.append(contract.timeline(year, pending))
        return full

    monkeypatch.setattr(contract, "_fetch", fetch)
    contract._fetch_satellites(year)  # pyright: ignore[reportPrivateUsage]  # the thread's body
    assert [(p.source, p.done, p.total) for p in during[0].progress] == [
        ("HLS", 3, 10),
        ("SMAP", 1, 286),
    ]
    assert contract.timeline(year, pending).progress == []
