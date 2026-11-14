"""Heat-unit (growing degree day) bloom windows for the GDD crops (plan WP11, D6)."""

from __future__ import annotations

from bisect import bisect_right
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

from pollination.models import Window


@dataclass(frozen=True)
class GddSeries:
    """Cumulative growing degree days, one value per day from the start day.

    Attributes:
        days: Days in ascending order, starting at the accumulation start.
        totals: Cumulative GDD at the end of each day.
        missing_days: Days without a temperature; they add nothing.
    """

    days: list[date]
    totals: list[float]
    missing_days: int


def accumulate(
    days: Sequence[date],
    tmax: Sequence[float | None],
    tmin: Sequence[float | None],
    base: float,
    start: date,
) -> GddSeries:
    """Sum ``max(0, (Tmax + Tmin) / 2 - base)`` day by day from ``start``.

    Args:
        days: Days in ascending order.
        tmax: Daily maximum temperature (°C) per day, None where missing.
        tmin: Daily minimum temperature (°C) per day, None where missing.
        base: Base temperature (°C).
        start: First day counted; earlier days are dropped.

    Returns:
        The cumulative series.
    """
    kept: list[date] = []
    totals: list[float] = []
    total, missing = 0.0, 0
    for day, hi, lo in zip(days, tmax, tmin, strict=True):
        if day < start:
            continue
        if hi is None or lo is None:
            missing += 1
        else:
            total += max(0.0, (hi + lo) / 2 - base)
        kept.append(day)
        totals.append(total)
    return GddSeries(kept, totals, missing)


def crossing(series: GddSeries, threshold: float) -> date | None:
    """Return the first day the cumulative GDD reaches ``threshold``, if any."""
    return next(
        (d for d, t in zip(series.days, series.totals, strict=True) if t >= threshold),
        None,
    )


def total_on(series: GddSeries, day: date) -> float | None:
    """Return the cumulative GDD at the end of ``day`` (or of the last data day).

    Returns:
        None if ``day`` is before the series starts.
    """
    i = bisect_right(series.days, day)
    return series.totals[i - 1] if i else None


def bloom_window(series: GddSeries, start_gdd: float, end_gdd: float) -> Window | None:
    """Return the days on which the bloom start and end thresholds are crossed.

    Returns:
        The window, or None if either threshold is not reached in the data.
    """
    start, end = crossing(series, start_gdd), crossing(series, end_gdd)
    if start is None or end is None:
        return None
    return Window(start=start, end=end)
