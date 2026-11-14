"""Heat-unit (GDD) accumulation and bloom windows on synthetic weather."""

from datetime import date, timedelta

import pytest

from pollination.engine.phenology import accumulate, bloom_window, crossing, total_on
from pollination.models import Window


def days(start: date, n: int) -> list[date]:
    return [start + timedelta(days=i) for i in range(n)]


def test_accumulates_mean_temperature_above_base_from_start() -> None:
    d = days(date(2024, 2, 27), 6)  # 27 Feb .. 3 Mar (leap year)
    tmax = [30.0] * 6
    tmin = [10.0] * 6  # mean 20, base 5 -> 15 per day
    series = accumulate(d, tmax, tmin, base=5.0, start=date(2024, 3, 1))
    assert series.days == d[3:]  # nothing before the start day
    assert series.totals == [15.0, 30.0, 45.0]
    assert series.missing_days == 0


def test_cold_days_add_nothing_and_gaps_are_counted() -> None:
    d = days(date(2024, 3, 1), 4)
    tmax = [2.0, None, 12.0, 12.0]
    tmin = [-4.0, 1.0, 8.0, None]
    series = accumulate(d, tmax, tmin, base=5.0, start=date(2024, 3, 1))
    assert series.totals == [0.0, 0.0, 5.0, 5.0]
    assert series.missing_days == 2


def test_crossing_and_total_on() -> None:
    series = accumulate(
        days(date(2024, 3, 1), 10), [20.0] * 10, [10.0] * 10, 5.0, date(2024, 3, 1)
    )  # 10 per day
    assert crossing(series, 30.0) == date(2024, 3, 3)
    assert crossing(series, 1000.0) is None
    assert total_on(series, date(2024, 3, 5)) == pytest.approx(50.0)
    assert total_on(series, date(2024, 4, 30)) == pytest.approx(100.0)  # data end
    assert total_on(series, date(2024, 2, 1)) is None


def test_bloom_window_needs_both_thresholds() -> None:
    series = accumulate(
        days(date(2024, 3, 1), 10), [20.0] * 10, [10.0] * 10, 5.0, date(2024, 3, 1)
    )
    assert bloom_window(series, 25.0, 61.0) == Window(
        start=date(2024, 3, 3), end=date(2024, 3, 7)
    )
    assert bloom_window(series, 25.0, 500.0) is None  # end never reached
