"""Failed season inputs wait before the next NASA attempt (WP23)."""

from collections.abc import Iterator

import pytest

from pollination import contract
from pollination import models as m
from pollination.engine.timeline import SeasonInputs

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
    monkeypatch.setattr(contract, "_failed_at", {})
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
