"""POWER indicators of a drawn polygon (WP13): GDD, precipitation, flight weather."""

from collections.abc import Sequence
from datetime import date, timedelta

import pytest

from pollination import models as m
from pollination.engine.polygon import power_response
from pollination.nasa.power import PowerDaily

BASE_C, MIN_TMAX_C, MAX_WIND_MS = 5.0, 15.0, 6.0
BASELINE = (2020, 2021, 2022, 2023, 2024)


def series(
    year: int,
    tmax: Sequence[float | None],
    tmin: Sequence[float | None],
    rain: Sequence[float | None],
    wind: Sequence[float | None],
) -> PowerDaily:
    """A POWER series from 1 March of ``year``, one value per day."""
    days = [date(year, 3, 1) + timedelta(days=i) for i in range(len(tmax))]
    values = {
        "T2M_MAX": list(tmax),
        "T2M_MIN": list(tmin),
        "PRECTOTCORR": list(rain),
        "WS2M": list(wind),
    }
    return PowerDaily(lat=47.5, lon=21.875, days=days, values=values)


def season() -> PowerDaily:
    """Five March days: GDD increments 0, 10, 6, 4, 12; 4.0 mm of rain, one gap."""
    return series(
        2024,
        tmax=[10, 20, 16, 14, 22],
        tmin=[0, 10, 6, 4, 12],
        rain=[1.0, None, 2.5, 0.0, 0.5],
        wind=[3, 5, 4, 2, 9],
    )


def history(totals: dict[int, float], gappy: Sequence[int] = ()) -> PowerDaily:
    """Several years of the same five March days; each year's rain sums to its total."""
    parts = [
        series(
            y,
            [10] * 5,
            [0] * 5,
            [t, None, None, None, None] if y in gappy else [t, 0, 0, 0, 0],
            [3] * 5,
        )
        for y, t in totals.items()
    ]
    return PowerDaily(
        lat=47.5,
        lon=21.875,
        days=[d for p in parts for d in p.days],
        values={k: [v for p in parts for v in p.values[k]] for k in parts[0].values},
    )


def respond(
    daily: PowerDaily | str = "unset", past: PowerDaily | str | None = None
) -> m.PowerResponse:
    """Run the pure calculation with the test thresholds."""
    return power_response(
        2024,
        season() if daily == "unset" else daily,
        history({2020: 2, 2021: 4, 2022: 6, 2023: 8, 2024: 4})
        if past is None
        else past,
        base_temp_c=BASE_C,
        min_tmax_c=MIN_TMAX_C,
        max_wind_ms=MAX_WIND_MS,
        baseline_years=BASELINE,
    )


def test_gdd_series_is_cumulative_from_the_first_of_march() -> None:
    """Daily increments 0, 10, 6, 4, 12 at base 5 C accumulate to 32."""
    response = respond()
    assert [p.gdd for p in response.gdd_series] == [0, 10, 16, 20, 32]
    assert response.gdd_series[0].day == date(2024, 3, 1)
    provenance = response.gdd_provenance
    assert provenance.kind == "Estimated"
    assert provenance.observed_at == date(2024, 3, 5)
    assert "5 C" in provenance.note
    assert "crop" in provenance.note  # a drawn polygon has no crop: generic base


def test_precipitation_total_skips_and_names_missing_days() -> None:
    """1.0 + 2.5 + 0.0 + 0.5 = 4.0 mm over four days; one day had no value."""
    total = respond().precipitation_total_mm
    assert total.value == pytest.approx(4.0)
    assert total.provenance.kind == "Estimated"
    assert "1 day" in total.provenance.note


def test_precipitation_anomaly_is_against_the_baseline_mean() -> None:
    """Baseline totals 2, 4, 6, 8, 4 average 4.8 mm, so 4.0 mm is 0.8 mm below."""
    anomaly = respond().precipitation_anomaly_mm
    assert anomaly.value == pytest.approx(-0.8)
    assert "2020-2024" in anomaly.provenance.note
    assert "5 years" in anomaly.provenance.note


def test_anomaly_needs_enough_baseline_years() -> None:
    """Three baseline years are too few for a mean: Missing, with the reason."""
    short = history({2022: 6, 2023: 8, 2024: 4})
    response = respond(past=short)
    assert response.precipitation_anomaly_mm.value is None
    assert response.precipitation_anomaly_mm.provenance.kind == "Missing"
    assert "3 years" in response.precipitation_anomaly_mm.provenance.note
    assert response.precipitation_total_mm.value == pytest.approx(4.0)  # unaffected


def test_bee_flight_days_need_warmth_and_calm() -> None:
    """Days 2 and 3 are at least 15 C and below 6 m/s; day 5 is warm but too windy."""
    days = respond().bee_flight_weather_days
    assert days.value == 2
    assert "15 C" in days.provenance.note
    assert "6 m/s" in days.provenance.note


def test_a_day_without_wind_is_not_counted_as_flight_weather() -> None:
    """Missing wind is unknown, not calm: the day is left out and reported."""
    gappy = series(
        2024,
        tmax=[20, 20],
        tmin=[10, 10],
        rain=[0, 0],
        wind=[None, 3],
    )
    days = respond(gappy).bee_flight_weather_days
    assert days.value == 1
    assert "1 day without" in days.provenance.note


def test_a_missing_season_series_gives_missing_everywhere_with_the_reason() -> None:
    """A failed POWER request is a reason on every indicator, not an error."""
    response = respond("NASA POWER request failed (HTTPStatusError)")
    assert response.gdd_series == []
    for measurement in (
        response.precipitation_total_mm,
        response.precipitation_anomaly_mm,
        response.bee_flight_weather_days,
    ):
        assert measurement.value is None
        assert measurement.provenance.kind == "Missing"
        assert "HTTPStatusError" in measurement.provenance.note
    assert response.gdd_provenance.kind == "Missing"


def test_a_missing_history_only_loses_the_anomaly() -> None:
    """The multi-year baseline failing must not take the season values with it."""
    response = respond(past="baseline request failed")
    assert response.precipitation_anomaly_mm.value is None
    assert (
        "baseline request failed" in response.precipitation_anomaly_mm.provenance.note
    )
    assert response.bee_flight_weather_days.value == 2
    assert response.gdd_series


def test_flight_weather_thresholds_edges() -> None:
    """Exactly 15 C flies; exactly 6 m/s does not (Tmax >= 15 C, wind below 6 m/s)."""
    edge = series(
        2024,
        tmax=[15, 15, 14.9],
        tmin=[5, 5, 5],
        rain=[0, 0, 0],
        wind=[5.9, 6.0, 1.0],
    )
    assert respond(edge).bee_flight_weather_days.value == 1


def test_days_after_the_season_end_are_ignored() -> None:
    """Only 1 March to 31 August counts, whatever else the series holds."""
    long = series(
        2024,
        tmax=[20] * 200,
        tmin=[10] * 200,
        rain=[1.0] * 200,
        wind=[2] * 200,
    )  # 1 March + 199 days runs into mid September
    response = respond(long)
    assert response.gdd_series[-1].day == date(2024, 8, 31)
    assert response.precipitation_total_mm.value == pytest.approx(184.0)  # 184 days
    assert response.bee_flight_weather_days.value == 184


def test_a_baseline_year_with_mostly_missing_rain_is_dropped() -> None:
    """2021 has rain on one of five days: not a usable total, so only four years."""
    past = history({2020: 2, 2021: 4, 2022: 6, 2023: 8, 2024: 4}, gappy=[2021])
    anomaly = respond(past=past).precipitation_anomaly_mm
    assert anomaly.value is None
    assert "4 years" in anomaly.provenance.note
