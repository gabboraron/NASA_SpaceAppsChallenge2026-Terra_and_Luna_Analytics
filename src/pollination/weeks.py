"""The season calendar: 26 weekly steps from 1 March (plan D12).

A leaf module, so the NASA clients and the engine can both use it.
"""

from __future__ import annotations

from datetime import date, timedelta

from pollination import models as m

WEEKS = range(1, 27)  # D12: weekly steps from 1 March, March-August
WEEK_DAYS = 7
SEASON_START = (3, 1)
SEASON_END = (8, 31)
# NASA products trail the calendar by days (HLS, SMAP) to weeks (POWER reanalysis).
SETTLE_DAYS = 14


def latest_season(today: date) -> int:
    """Latest season whose NASA data is complete: this year from mid-September."""
    settled = today - timedelta(days=SETTLE_DAYS)
    # shortcut: complete seasons only; a running season needs a "today" cutoff.
    past_end = (settled.month, settled.day) > SEASON_END
    return settled.year if past_end else settled.year - 1


def week_start(year: int, week: int) -> date:
    """First day of timeline week ``week`` (1 = the week starting 1 March)."""
    return date(year, *SEASON_START) + timedelta(weeks=week - 1)


def week_of(year: int, day: date) -> int | None:
    """Timeline week containing ``day``, or None outside March-August weeks."""
    offset = (day - date(year, *SEASON_START)).days
    week = offset // WEEK_DAYS + 1
    return week if offset >= 0 and week in WEEKS else None


def week_end(year: int, week: int) -> date:
    """Last day of timeline week ``week``."""
    return week_start(year, week) + timedelta(days=WEEK_DAYS - 1)


def week_mid(year: int, week: int) -> date:
    """Middle day of timeline week ``week``."""
    return week_start(year, week) + timedelta(days=WEEK_DAYS // 2)


def in_year(day: date, year: int) -> date:
    """The same calendar date in ``year`` (29 Feb becomes 28 Feb)."""
    try:
        return day.replace(year=year)
    except ValueError:
        return date(year, 2, 28)


def window_in_year(window: m.Window, year: int) -> m.Window:
    """``window`` moved to ``year`` by calendar date."""
    return m.Window(start=in_year(window.start, year), end=in_year(window.end, year))
