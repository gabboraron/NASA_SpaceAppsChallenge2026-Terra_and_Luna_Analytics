"""SMAP for the map view: blocks answer once fetched, the rest is queued."""

from datetime import date
from threading import Event

import pytest

from pollination import smap_area
from pollination.geo import SmapCell
from pollination.nasa.smap import SmapSeason, SmapWeek

VIEW = (21.6, 47.7, 22.4, 48.05)
YEAR, WEEK = 2024, 10


@pytest.fixture(autouse=True)
def clean_state() -> None:
    """Nothing fetched, queued or running from another test."""
    smap_area._done.clear()  # pyright: ignore[reportPrivateUsage]  # test reset
    smap_area._queue.clear()  # pyright: ignore[reportPrivateUsage]  # test reset
    smap_area._progress.clear()  # pyright: ignore[reportPrivateUsage]  # test reset


def season(cells: list[SmapCell]) -> SmapSeason:
    weeks = {WEEK: SmapWeek(0.2, 40.0, date(YEAR, 5, 6))}
    return SmapSeason(dict.fromkeys(cells, weeks), "2015-2024")


def test_blocks_cover_the_view_once() -> None:
    blocks = smap_area.view_blocks(VIEW)
    cells = {c for b in blocks for c in smap_area.block_cells(b)}
    assert len(cells) == len(blocks) * smap_area.BLOCK_CELLS**2  # no overlap
    assert set(smap_area.smap_cells(VIEW)) <= cells


def test_view_is_pending_then_answers_and_prefetches_around() -> None:
    release, fetched = Event(), Event()
    asked: list[int] = []

    def fetch(
        year: int, cells: list[SmapCell], progress: smap_area.Progress
    ) -> SmapSeason:
        progress(1, 2)
        asked.append(year)
        fetched.set()
        assert release.wait(5)
        return season(cells)

    blocks = smap_area.view_blocks(VIEW)
    first = smap_area.area(YEAR, WEEK, VIEW, fetch)
    assert first.pending
    assert first.cells == []
    assert fetched.wait(5)
    during = smap_area.area(YEAR, WEEK, VIEW, fetch)
    assert during.progress is not None
    assert 0 < during.progress.done < during.progress.total

    release.set()
    for _ in range(500):  # the view's blocks, then the ring around them
        if len(asked) == len(blocks) + 8 * len(blocks):
            break
        Event().wait(0.01)
    done = smap_area.area(YEAR, WEEK, VIEW, fetch)
    assert not done.pending
    assert len(done.cells) == len(blocks) * smap_area.BLOCK_CELLS**2
    assert {c.week for c in done.cells} == {WEEK}
    assert len(asked) > len(blocks)  # the surrounding blocks were fetched too


def test_wide_view_says_why_and_no_token_stays_quiet() -> None:
    wide = smap_area.area(YEAR, WEEK, (0, 30, 40, 60), None)
    assert (wide.cells, wide.pending, wide.note) == ([], False, smap_area.ZOOM_IN)
    no_token = smap_area.area(YEAR, WEEK, VIEW, None)
    assert (no_token.cells, no_token.pending, no_token.note) == ([], False, "")


def test_failed_block_carries_its_reason() -> None:
    def fetch(
        year: int, cells: list[SmapCell], progress: smap_area.Progress
    ) -> SmapSeason:
        raise TimeoutError

    answer = smap_area.area(YEAR, WEEK, VIEW, fetch)
    for _ in range(500):
        answer = smap_area.area(YEAR, WEEK, VIEW, fetch)
        if not answer.pending:
            break
        Event().wait(0.01)
    assert answer.note == "NASA SMAP did not answer in time"
