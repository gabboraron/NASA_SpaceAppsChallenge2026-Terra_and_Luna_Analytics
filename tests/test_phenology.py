"""Heat-unit (GDD) accumulation and bloom windows on synthetic weather."""

import math
from datetime import date, timedelta

import pytest

from pollination.engine.phenology import (
    accumulate,
    chill_days,
    chill_rates,
    crossing,
    sigmoid_forcing,
    threshold_window,
    total_on,
)
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


def test_end_threshold_window_needs_both_thresholds() -> None:
    series = accumulate(
        days(date(2024, 3, 1), 10), [20.0] * 10, [10.0] * 10, 5.0, date(2024, 3, 1)
    )
    assert threshold_window(series, 25.0, end_threshold=61.0) == Window(
        start=date(2024, 3, 3), end=date(2024, 3, 7)
    )
    assert threshold_window(series, 25.0, end_threshold=500.0) is None


def test_sigmoid_forcing_follows_chmielewski_eq_3_2() -> None:
    d = days(date(2024, 1, 1), 3)
    # Daily means 3.3 (not above the base), 15 and 21.7 (= TBf + 18.4, half of 28.4).
    series = sigmoid_forcing(d, [4.3, 20.0, 26.7], [2.3, 10.0, 16.7], 3.3, d[0])
    rate_15 = 28.4 / (1 + math.exp(-0.185 * (15 - 3.3 - 18.4)))
    assert series.totals == pytest.approx([0.0, rate_15, rate_15 + 14.2])


@pytest.mark.parametrize(
    ("tmax", "tmin", "chill", "forcing"),
    [
        (20.0, 10.0, 0.0, 7.0),  # 0 <= TB <= Tn <= Tx: forcing Tm - TB
        (12.0, 2.0, -(7.0 - 2.0) + 0.8, 0.8),  # 0 <= Tn < TB <= Tx: 16/20 = 0.8
        (6.0, 2.0, -2.0, 0.0),  # 0 <= Tn <= Tx <= TB: -(Tm - Tn)
        (4.0, -4.0, -1.0, 0.0),  # Tn < 0 < Tx <= TB: -Tx^2/2(Tx-Tn)
        (12.0, -4.0, -(4.5 - 0.5), 0.5),  # Tn < 0 <= TB < Tx
        (-1.0, -6.0, 0.0, 0.0),  # Tx < 0
    ],
)
def test_chill_rates_match_kim_2021_table_2(
    tmax: float, tmin: float, chill: float, forcing: float
) -> None:
    assert chill_rates(tmax, tmin, 8.0) == pytest.approx((chill, forcing))


def test_chill_days_forces_from_the_day_chilling_is_met() -> None:
    d = days(date(2023, 10, 1), 6)
    tmax = [6.0, 6.0, 6.0, 20.0, 20.0, None]
    tmin = [2.0, 2.0, 2.0, 10.0, 10.0, None]  # chill -2/day, then forcing 7/day
    series = chill_days(
        d, tmax, tmin, base=8.0, chill_start=d[0], chill_requirement=-6.0
    )
    assert series is not None
    assert series.days[0] == date(2023, 10, 3)  # t1: chilling reaches C* = -6
    assert series.totals == [0.0, 7.0, 14.0, 14.0]
    assert series.missing_days == 1
    assert (
        chill_days(d, tmax, tmin, base=8.0, chill_start=d[0], chill_requirement=-99)
        is None
    )


def test_threshold_window_end_rules() -> None:
    series = accumulate(
        days(date(2024, 3, 1), 30), [20.0] * 30, [10.0] * 30, 5.0, date(2024, 3, 1)
    )  # 10 per day, 50 on 5 March
    assert threshold_window(series, 50.0, end_threshold=101.0) == Window(
        start=date(2024, 3, 5), end=date(2024, 3, 11)
    )
    assert threshold_window(series, 50.0, bloom_days=10) == Window(
        start=date(2024, 3, 5), end=date(2024, 3, 15)
    )
    assert threshold_window(series, 50.0, bloom_days=10, centred=True) == Window(
        start=date(2024, 2, 29), end=date(2024, 3, 10)
    )
    with pytest.raises(ValueError, match="bloom_days"):
        threshold_window(series, 50.0)  # no end rule
    assert threshold_window(series, 999.0, bloom_days=10) is None
