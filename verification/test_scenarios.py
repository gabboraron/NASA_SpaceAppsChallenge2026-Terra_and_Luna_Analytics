"""Offline tests of the scenarios: a correct model passes, a wrong one fails.

The synthetic world has known locust and sunflower flows per year; the
"perfect" model blooms exactly in the weeks of those flows.
"""

from datetime import date, timedelta

import pytest

from verification.framework import (
    Context,
    ModelWeek,
    Outcome,
    Result,
    Scenario,
    Status,
    Weather,
    load_thresholds,
    render_csv,
    render_markdown,
    run_all,
)
from verification.scenarios import SCENARIOS

LOCUST = {
    2021: date(2021, 5, 26),
    2022: date(2022, 5, 20),
    2023: date(2023, 5, 19),
    2024: date(2024, 4, 30),
    2025: date(2025, 4, 24),
}
SUNFLOWER = {
    2021: date(2021, 6, 20),
    2022: date(2022, 7, 20),
    2023: date(2023, 6, 25),
    2024: date(2024, 7, 1),
}
SUNFLOWER_KG_PER_DAY = {2022: 1.0, 2024: 3.0}  # 2022 weak, 2024 strong
FLOW_DAYS = 7


def hive_gains() -> dict[date, float | None]:
    """Daily gains: zero, plus 7-day flows at the known dates."""
    gains: dict[date, float | None] = {}
    for year, onset in LOCUST.items():
        day = date(year, 3, 1)
        while day <= date(year, 8, 31):
            gains[day] = -0.1
            day += timedelta(days=1)
        for i in range(FLOW_DAYS):
            gains[onset + timedelta(days=i)] = 2.0
            if year in SUNFLOWER:
                kg = SUNFLOWER_KG_PER_DAY.get(year, 2.0)
                gains[SUNFLOWER[year] + timedelta(days=i)] = kg
    return gains


def weather() -> list[Weather]:
    """Warm spells before the early years so that GDD tracks the onsets."""
    days: list[Weather] = []
    for year, onset in LOCUST.items():
        day = date(year, 1, 1)
        while day <= date(year, 8, 31):
            # A simple ramp that reaches the same warmth sum at each onset.
            progress = (day - date(year, 1, 1)).days / (onset - date(year, 1, 1)).days
            mean = 25.0 * progress
            days.append(Weather(day, mean + 5, mean - 5, 2.0))
            day += timedelta(days=1)
    return days


def weeks_for(
    year: int, start: date, kg: float, shift_days: int, low: float
) -> list[ModelWeek]:
    """Timeline weeks (from 1 March) blooming where the shifted flow is."""
    flow = {start + timedelta(days=shift_days + i) for i in range(FLOW_DAYS)}
    result: list[ModelWeek] = []
    for w in range(26):
        starts_on = date(year, 3, 1) + timedelta(weeks=w)
        overlap = sum(starts_on + timedelta(days=i) in flow for i in range(7)) / 7
        blooming = 0.0 if overlap == 0 else 0.5 + overlap / 2
        result.append(ModelWeek(starts_on, 4, blooming, low if kg else 0.0, 0.0))
    return result


def context(shift: dict[int, int] | None = None) -> Context:
    """Synthetic run context; ``shift`` moves the model's locust bloom per year."""
    shift = shift or {}
    model = {
        year: {
            "black_locust": weeks_for(year, LOCUST[year], 1, shift.get(year, 0), 0.0),
            "sunflower": weeks_for(
                year,
                SUNFLOWER[year],
                1,
                0,
                1.0 if SUNFLOWER_KG_PER_DAY[year] < 2 else 0.0,
            ),
        }
        for year in (2022, 2024)
    }
    inat = {
        year: {onset.isocalendar().week + o: c for o, c in ((-1, 10), (0, 30), (1, 10))}
        for year, onset in LOCUST.items()
    }
    return Context(
        thresholds=load_thresholds(),
        model=model,
        hives={"hiveA": hive_gains(), "hiveB": hive_gains()},
        weather=weather(),
        inat=inat,
    )


def by_id(results: list[Result]) -> dict[str, Result]:
    return {r.id: r for r in results}


def test_perfect_model_passes_every_gate() -> None:
    results = by_id(run_all(context(), SCENARIOS))
    for sid in ("S1", "S2", "S4", "B0"):
        assert results[sid].status == Status.PASS, results[sid]
    assert results["R0"].status == Status.REPORTED
    # Day of year: 20 May 2022 is day 140, 30 Apr 2024 (leap year) is day 121.
    assert results["S2"].metrics["hive_shift_days"] == -19


def test_three_week_late_locust_fails_onset_and_baseline() -> None:
    results = by_id(run_all(context({2022: 21, 2024: 21}), SCENARIOS))
    assert results["S1"].status == Status.FAIL
    assert results["B0"].status == Status.FAIL
    assert results["S2"].status == Status.PASS  # same error both years keeps the shift


def test_wrong_year_shift_fails() -> None:
    results = by_id(run_all(context({2024: 21}), SCENARIOS))
    assert results["S2"].status == Status.FAIL
    assert results["S1"].status == Status.FAIL


def test_nectar_flag_ranking() -> None:
    result = by_id(run_all(context(), SCENARIOS))["S5"]
    assert result.status == Status.REPORTED
    assert result.metrics["sunflower_ranking_agrees"] is True


def test_gdd_clock_beats_calendar_when_warmth_drives_onset() -> None:
    result = by_id(run_all(context(), SCENARIOS))["S3"]
    assert result.status == Status.REPORTED
    assert result.metrics["gdd_beats_calendar"] is True


def test_inaturalist_peak_is_compared() -> None:
    result = by_id(run_all(context(), SCENARIOS))["S7"]
    assert result.status == Status.REPORTED
    assert result.metrics["2024_inat_peak"] == "2024-05-02"


def test_missing_model_is_insufficient_not_fail() -> None:
    ctx = context()
    for crops in ctx.model.values():
        for crop, weeks in crops.items():
            crops[crop] = [
                ModelWeek(w.starts_on, w.parcels, 0.0, 0.0, 1.0) for w in weeks
            ]
    results = by_id(run_all(ctx, SCENARIOS))
    for sid in ("S1", "S2", "S4", "S5", "B0"):
        assert results[sid].status == Status.INSUFFICIENT, sid
    assert results["S8"].status == Status.INSUFFICIENT  # no PEP725 file


def test_no_references_is_insufficient() -> None:
    ctx = Context(thresholds=load_thresholds())
    assert {r.status for r in run_all(ctx, SCENARIOS)} == {Status.INSUFFICIENT}


def test_crashing_scenario_is_an_error_not_a_data_gap() -> None:
    def boom(_: Context) -> Outcome:
        raise KeyError("x")

    results = run_all(context(), [Scenario("X", "?", boom)])
    assert results[0].status == Status.ERROR
    assert (results[0].id, results[0].question) == ("X", "?")


def test_only_filter_and_reports() -> None:
    results = run_all(context(), SCENARIOS, only={"S1"})
    assert [r.id for r in results] == ["S1"]
    assert "| S1 |" in render_markdown(results, ["note"])
    assert render_csv(results).startswith("id,status,metric,value\nS1,PASS,")


@pytest.mark.parametrize("year", [2022, 2024])
def test_perfect_onset_error_is_within_a_week(year: int) -> None:
    result = by_id(run_all(context(), SCENARIOS))["S1"]
    assert abs(int(str(result.metrics[f"{year}_error_days"]))) <= 6
    # The weekly reading is reported next to the gated one.
    assert f"{year}_week_error_days" in result.metrics
