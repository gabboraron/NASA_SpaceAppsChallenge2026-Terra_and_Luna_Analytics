"""Offline tests of the signal extraction (synthetic series, no network)."""

from datetime import date, datetime, timedelta

import pytest

from pollination.models import BloomState, Parcel, ParcelWeek, Provenance, Window
from verification.framework import CropWindow, ModelWeek, Weather, load_thresholds
from verification.model import summarise
from verification.signals import (
    crop_flow,
    daily_gains,
    day_reaching,
    flows,
    gdd_series,
    histogram_peak,
    is_flight_day,
    model_onset,
    model_peak,
)

S = load_thresholds().signal


def nights(start: date, weights: list[float]) -> list[tuple[datetime, float]]:
    """Readings at 02:00 (rest) and 14:00 (noise) for consecutive days."""
    readings: list[tuple[datetime, float]] = []
    for i, w in enumerate(weights):
        day = datetime.combine(start + timedelta(days=i), datetime.min.time())
        readings.append((day + timedelta(hours=2), w))
        readings.append((day + timedelta(hours=14), w - 3.0))  # bees out foraging
    return readings


def test_daily_gain_uses_last_night_reading() -> None:
    day = datetime(2024, 5, 1)
    readings = [
        (day + timedelta(hours=1), 40.0),
        (day + timedelta(hours=4), 40.2),  # last before 05:00 wins
        (day + timedelta(days=1, hours=4), 41.0),
    ]
    assert daily_gains(readings, S) == {date(2024, 5, 1): pytest.approx(0.8)}


def test_hive_work_jump_is_dropped() -> None:
    gains = daily_gains(nights(date(2024, 5, 1), [40.0, 41.0, 61.0, 62.0]), S)
    assert gains[date(2024, 5, 2)] is None  # +20 kg super added
    assert gains[date(2024, 5, 3)] == pytest.approx(1.0)


def flow_series(start: date, gains: list[float]) -> list[tuple[datetime, float]]:
    weights = [40.0]
    for g in gains:
        weights.append(weights[-1] + g)
    return nights(start, weights)


def test_flow_found_with_rain_gap_and_super_jump() -> None:
    start = date(2024, 4, 20)
    pattern = [0.0] * 8 + [2.0, 3.0, -0.2, 3.0, 2.5, 2.0] + [0.0] * 3 + [20.0, -0.1]
    found = flows(daily_gains(flow_series(start, pattern), S), S)
    assert len(found) == 1
    flow = found[0]
    assert flow.start == start + timedelta(days=8)
    assert flow.end == start + timedelta(days=13)
    assert flow.total_kg == pytest.approx(12.3)
    assert flow.start <= flow.peak <= flow.end


def test_small_flow_and_long_gap_split() -> None:
    start = date(2024, 6, 1)
    pattern = [1.0, 1.0, 0.0, 0.0, 0.0, 2.0, 2.0, 2.0]
    found = flows(daily_gains(flow_series(start, pattern), S), S)
    assert [f.start for f in found] == [start + timedelta(days=5)]  # first < 3 kg


def test_crop_flow_picks_largest_in_window() -> None:
    start = date(2024, 4, 1)
    pattern = [2.0] * 4 + [0.0] * 30 + [3.0] * 5 + [0.0] * 50 + [2.0] * 5
    found = flows(daily_gains(flow_series(start, pattern), S), S)
    window = CropWindow.model_validate({"window": ("04-10", "06-20")})
    picked = crop_flow(found, window, 2024)
    assert picked is not None
    assert picked.start == start + timedelta(days=34)


def week(starts_on: date, blooming: float) -> ModelWeek:
    return ModelWeek(starts_on, 4, blooming, 0.0, 0.0)


def test_model_onset_and_peak() -> None:
    weeks = [
        week(date(2024, 3, 1) + timedelta(weeks=i), b)
        for i, b in enumerate([0, 0.25, 0.5, 1.0, 0.75, 0])
    ]
    assert model_onset(weeks, 0.5) == date(2024, 3, 15)
    assert model_peak(weeks, 0.5) == date(2024, 3, 25)
    assert model_onset(weeks[:2], 0.5) is None


def test_model_onset_is_the_modelled_start_when_the_timeline_gives_one() -> None:
    first = ModelWeek(date(2024, 3, 15), 4, 1.0, 0.0, 0.0, date(2024, 3, 19))
    weeks = [week(date(2024, 3, 8), 0.25), first, week(date(2024, 3, 22), 1.0)]
    assert model_onset(weeks, 0.5) == date(2024, 3, 19)
    assert model_peak(weeks, 0.5) == date(2024, 3, 18)  # the peak stays weekly


def test_summarise_takes_the_median_start_of_the_blooming_parcels() -> None:
    starts = {"P1": date(2024, 4, 24), "P2": date(2024, 4, 25), "P3": date(2024, 4, 27)}
    parcels = [
        Parcel.model_construct(id=i, crop="black_locust") for i in [*starts, "P4"]
    ]
    known = Provenance(kind="Estimated", source="model", observed_at=None)

    def entry(parcel: str, state: BloomState, start: date | None) -> ParcelWeek:
        window = Window(start=start, end=start + timedelta(days=9)) if start else None
        return ParcelWeek.model_construct(
            parcel_id=parcel,
            starts_on=date(2024, 4, 19),
            bloom_state=state,
            bloom_provenance=known,
            nectar_state="normal",
            estimated_bloom=window,
        )

    weeks = [entry(p, "blooming", s) for p, s in starts.items()]
    weeks.append(entry("P4", "pre_bloom", date(2024, 5, 20)))
    (found,) = summarise(parcels, weeks)["black_locust"]
    assert found.blooming == 0.75
    assert found.bloom_start == date(2024, 4, 25)


def test_gdd_accumulates_from_start() -> None:
    days = [
        Weather(date(2024, 1, 1) + timedelta(days=i), 20.0, 10.0, 2.0)
        for i in range(10)
    ]
    series = gdd_series(days, 10.0, (1, 3), 2024)
    assert series[date(2024, 1, 3)] == pytest.approx(5.0)
    assert series[date(2024, 1, 10)] == pytest.approx(40.0)
    assert day_reaching(series, 12.0) == date(2024, 1, 5)


def test_flight_day_rule() -> None:
    assert is_flight_day(Weather(date(2024, 5, 1), 18.0, 8.0, 3.0), 15.0, 5.0)
    assert not is_flight_day(Weather(date(2024, 5, 1), 14.0, 8.0, 3.0), 15.0, 5.0)
    assert not is_flight_day(Weather(date(2024, 5, 1), 18.0, 8.0, 6.0), 15.0, 5.0)
    assert is_flight_day(Weather(date(2024, 5, 1), None, 8.0, 3.0), 15.0, 5.0) is None


def test_histogram_peak_ignores_out_of_season() -> None:
    window = CropWindow.model_validate({"window": ("04-10", "06-20")})
    counts = {18: 10, 19: 30, 20: 12, 38: 500}  # week 38: seed pods
    peak = histogram_peak(counts, 2024, window)
    assert peak == (date.fromisocalendar(2024, 19, 4), 52)
    assert histogram_peak({38: 5}, 2024, window) is None
