"""Heat-unit bloom models for the tree crops (plan WP11, D6).

Three ways to turn daily POWER temperatures into a cumulative heat series:

* :func:`accumulate`: linear growing degree days, ``max(0, Tmean - base)``.
* :func:`sigmoid_forcing`: the sigmoid forcing rate of Chmielewski et al. (2011),
  Meteorol. Z. 20:487-496, doi:10.1127/0941-2948/2011/0258, Eq. 3.2.
* :func:`chill_days`: the sequential chill-days model of Cesaraccio et al. (2004),
  Agric. For. Meteorol. 126:1-13, doi:10.1016/j.agrformet.2004.03.002 (corrigendum
  129:211), with the equations as printed in Table 2 of Kim et al. (2021),
  J. Korean Soc. For. Sci. 110:322-340, doi:10.14578/jkfs.2021.110.3.322.

The parameters live in ``data/phenology.json``; only the published equation
constants are here.
"""

from __future__ import annotations

import math
from bisect import bisect_right
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import date, timedelta

from pollination.models import Window

# Chmielewski et al. 2011, Eq. 3.2: Rf = A / (1 + exp(-B * (T - TBf - C))).
SIGMOID_A = 28.4
SIGMOID_B = 0.185
SIGMOID_C = 18.4


@dataclass(frozen=True)
class HeatSeries:
    """A cumulative heat sum (degree days or forcing units), one value per day.

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
) -> HeatSeries:
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
    return _daily(
        days, tmax, tmin, start, lambda hi, lo: max(0.0, (hi + lo) / 2 - base)
    )


def _daily(
    days: Sequence[date],
    tmax: Sequence[float | None],
    tmin: Sequence[float | None],
    start: date,
    rate: Callable[[float, float], float],
) -> HeatSeries:
    """Sum ``rate(Tmax, Tmin)`` day by day from ``start``; missing days add 0."""
    kept: list[date] = []
    totals: list[float] = []
    total, missing = 0.0, 0
    for day, hi, lo in zip(days, tmax, tmin, strict=True):
        if day < start:
            continue
        if hi is None or lo is None:
            missing += 1
        else:
            total += rate(hi, lo)
        kept.append(day)
        totals.append(total)
    return HeatSeries(kept, totals, missing)


def sigmoid_forcing(
    days: Sequence[date],
    tmax: Sequence[float | None],
    tmin: Sequence[float | None],
    base: float,
    start: date,
) -> HeatSeries:
    """Sum the sigmoid forcing rate of Chmielewski et al. (2011) from ``start``.

    The daily rate is ``28.4 / (1 + exp(-0.185 * (T - base - 18.4)))`` for a daily
    mean ``T = (Tmax + Tmin) / 2`` above ``base``, else 0 (forcing units).

    Args:
        days: Days in ascending order.
        tmax: Daily maximum temperature (°C) per day, None where missing.
        tmin: Daily minimum temperature (°C) per day, None where missing.
        base: Base temperature TBf (°C).
        start: First day counted.

    Returns:
        The cumulative forcing series.
    """

    def rate(hi: float, lo: float) -> float:
        mean = (hi + lo) / 2
        if mean <= base:
            return 0.0
        return SIGMOID_A / (1 + math.exp(-SIGMOID_B * (mean - base - SIGMOID_C)))

    return _daily(days, tmax, tmin, start, rate)


def chill_rates(tmax: float, tmin: float, base: float) -> tuple[float, float]:
    """Chilling rate Rc (<= 0) and forcing rate Rf (>= 0) of one day.

    Single-triangle degree days around the base temperature ``base`` (> 0), as in
    Kim et al. (2021), Table 2.

    Returns:
        ``(chill, anti_chill)`` in degree days.
    """
    mean = (tmax + tmin) / 2
    if tmax <= 0:
        return 0.0, 0.0
    if tmin >= base:
        return 0.0, mean - base
    above = (tmax - base) ** 2 / (2 * (tmax - tmin)) if tmax > base else 0.0
    if tmin >= 0:
        return -((mean - tmin) - above), above
    return -(tmax**2 / (2 * (tmax - tmin)) - above), above


def chill_days(  # noqa: PLR0913 -- the weather series plus the three model parameters
    days: Sequence[date],
    tmax: Sequence[float | None],
    tmin: Sequence[float | None],
    *,
    base: float,
    chill_start: date,
    chill_requirement: float,
) -> HeatSeries | None:
    """Forcing after chilling, from the sequential chill-days model.

    The chilling rate accumulates from ``chill_start`` until its sum reaches
    ``chill_requirement`` (a negative number) on day t1; from t1 on, the forcing
    rate accumulates.

    Args:
        days: Days in ascending order, starting on or before ``chill_start``.
        tmax: Daily maximum temperature (°C) per day, None where missing.
        tmin: Daily minimum temperature (°C) per day, None where missing.
        base: Base temperature TB (°C), above 0.
        chill_start: First day of chilling (start of endodormancy).
        chill_requirement: Chilling requirement C* (°D, negative).

    Returns:
        The cumulative forcing from t1, or None if chilling is never met in the
        data.
    """
    chill = 0.0
    for day, hi, lo in zip(days, tmax, tmin, strict=True):
        if day < chill_start or hi is None or lo is None:
            continue
        chill += chill_rates(hi, lo, base)[0]
        if chill <= chill_requirement:
            return _daily(
                days, tmax, tmin, day, lambda h, low: chill_rates(h, low, base)[1]
            )
    return None


def crossing(series: HeatSeries, threshold: float) -> date | None:
    """Return the first day the cumulative GDD reaches ``threshold``, if any."""
    return next(
        (d for d, t in zip(series.days, series.totals, strict=True) if t >= threshold),
        None,
    )


def total_on(series: HeatSeries, day: date) -> float | None:
    """Return the cumulative GDD at the end of ``day`` (or of the last data day).

    Returns:
        None if ``day`` is before the series starts.
    """
    i = bisect_right(series.days, day)
    return series.totals[i - 1] if i else None


def threshold_window(
    series: HeatSeries,
    threshold: float,
    *,
    end_threshold: float | None = None,
    bloom_days: int | None = None,
    centred: bool = False,
) -> Window | None:
    """Bloom window from the day the heat sum reaches ``threshold``.

    The window ends where the sum reaches ``end_threshold``, or else lasts
    ``bloom_days``: from the threshold day, or centred on it when the threshold
    marks full bloom (``centred``).

    Returns:
        The window, or None if a threshold is not reached in the data.

    Raises:
        ValueError: Neither ``end_threshold`` nor ``bloom_days`` is given.
    """
    day = crossing(series, threshold)
    if day is None:
        return None
    if end_threshold is not None:
        end = crossing(series, end_threshold)
        return None if end is None else Window(start=day, end=end)
    if bloom_days is None:
        raise ValueError("A bloom window needs end_threshold or bloom_days")
    first = day - timedelta(days=bloom_days // 2 if centred else 0)
    return Window(start=first, end=first + timedelta(days=bloom_days))
