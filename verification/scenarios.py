"""Verification scenarios: each compares one NASA-driven output with past data."""

from __future__ import annotations

import statistics
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta

from verification.framework import (
    Context,
    Metric,
    ModelWeek,
    MonthDay,
    Outcome,
    Scenario,
    Status,
    Weather,
)
from verification.signals import (
    WEEK_DAYS,
    Flow,
    bloom_weeks,
    crop_flows,
    day_reaching,
    doy,
    flows,
    gdd_series,
    has_evidence,
    histogram_peak,
    is_flight_day,
    model_onset,
    model_peak,
    on_doy,
)

LOCUST = "black_locust"
SUNFLOWER = "sunflower"
ORCHARDS = ("apple", "sour_cherry")
MIN_GDD_YEARS = 3  # leave-one-year-out needs at least two years to learn from
PAIR = 2  # a shift or a ranking compares exactly two years

type Found = tuple[dict[str, Metric], dict[int, int], list[str]]


# --- shared helpers -------------------------------------------------------------


def _mean_date(days: Sequence[date]) -> date | None:
    """Average date (by ordinal), or None for no dates."""
    if not days:
        return None
    return date.fromordinal(round(statistics.fmean(d.toordinal() for d in days)))


def _median_date(days: Sequence[date]) -> date:
    return date.fromordinal(round(statistics.median(d.toordinal() for d in days)))


def _iso(day: date | None) -> str | None:
    return day.isoformat() if day else None


def calendar_guess(observed: Mapping[int, date], year: int) -> date:
    """Baseline: the mean day of year of the *other* years, placed in ``year``."""
    return on_doy(
        year, statistics.fmean(doy(d) for y, d in observed.items() if y != year)
    )


@dataclass(frozen=True)
class CropFlows:
    """Reference flows of one crop.

    Attributes:
        main: (hive, year) -> the crop's largest flow.
        season_kg: (hive, year) -> total gain of all the crop's flows (0 if none).
    """

    main: dict[tuple[str, int], Flow]
    season_kg: dict[tuple[str, int], float]

    def ref_date(self, year: int, *, peak: bool = False) -> date | None:
        """Mean onset (or peak) over the hives with a flow in ``year``."""
        return _mean_date(
            [
                f.peak if peak else f.start
                for (_, y), f in self.main.items()
                if y == year
            ]
        )

    def by_year(self, *, peak: bool = False) -> dict[int, date]:
        """Year -> mean onset (or peak), for every year with a flow."""
        years = sorted({y for _, y in self.main})
        return {y: d for y in years if (d := self.ref_date(y, peak=peak))}


def crop_reference(ctx: Context, crop: str) -> CropFlows:
    """Attribute every hive's flows to ``crop`` for each year of data."""
    window = ctx.thresholds.crops[crop]
    main: dict[tuple[str, int], Flow] = {}
    season: dict[tuple[str, int], float] = {}
    for hive, gains in ctx.hives.items():
        all_flows = flows(gains, ctx.thresholds.signal)
        for year in sorted({d.year for d in gains}):
            mine = crop_flows(all_flows, window, year)
            season[(hive, year)] = sum(f.total_kg for f in mine)
            if mine:
                main[(hive, year)] = max(mine, key=lambda f: f.total_kg)
    return CropFlows(main, season)


def hive_covers(ctx: Context, hive: str, crop: str, year: int) -> bool:
    """Whether a hive has usable data for most of the crop window of a year."""
    first, last = ctx.thresholds.crops[crop].bounds(year)
    days = sum(
        1 for d, g in ctx.hives[hive].items() if g is not None and first <= d <= last
    )
    return days >= ((last - first).days + 1) / 2


def model_weeks(ctx: Context, year: int, crop: str) -> list[ModelWeek] | None:
    """The crop's weekly summary in a model year, or None without any evidence."""
    weeks = ctx.model.get(year, {}).get(crop)
    return weeks if weeks and has_evidence(weeks) else None


def _model_date(
    ctx: Context, year: int, crop: str, *, peak: bool = False
) -> date | None:
    weeks = model_weeks(ctx, year, crop)
    if weeks is None:
        return None
    share = ctx.thresholds.model.bloom_share
    return model_peak(weeks, share) if peak else model_onset(weeks, share)


def _date_errors(ctx: Context, ref: CropFlows, crop: str, *, peak: bool) -> Found:
    """Model minus reference (days) per model year, with metrics and notes."""
    metrics: dict[str, Metric] = {}
    errors: dict[int, int] = {}
    notes: list[str] = []
    what = "peak" if peak else "onset"
    for year in sorted(ctx.model):
        modelled = _model_date(ctx, year, crop, peak=peak)
        observed = ref.ref_date(year, peak=peak)
        metrics[f"{year}_model_{what}"] = _iso(modelled)
        metrics[f"{year}_hive_{what}"] = _iso(observed)
        if modelled is None:
            notes.append(
                f"{year}: no {crop} bloom with evidence in the model timeline."
            )
        if observed is None:
            notes.append(f"{year}: no {crop} flow in the hive data.")
        if modelled and observed:
            errors[year] = (modelled - observed).days
            metrics[f"{year}_error_days"] = errors[year]
    return metrics, errors, notes


def _gate(found: Found, limit: float) -> Outcome:
    """PASS when every per-year error is within ``limit`` days."""
    metrics, errors, notes = found
    if not errors:
        return Outcome(Status.INSUFFICIENT, metrics, tuple(notes))
    metrics["limit_days"] = limit
    ok = all(abs(e) <= limit for e in errors.values())
    return Outcome(Status.PASS if ok else Status.FAIL, metrics, tuple(notes))


def _inat_peak(ctx: Context, year: int) -> tuple[date, int] | None:
    counts = ctx.inat.get(year)
    window = ctx.thresholds.crops[LOCUST]
    peak = histogram_peak(counts, year, window) if counts else None
    return peak if peak and peak[1] >= ctx.thresholds.inat.min_obs else None


def _shift(a: date, b: date) -> int:
    """Calendar shift of ``b`` against ``a`` (day of year, years ignored)."""
    return doy(b) - doy(a)


def _gdd_loo(
    weather: Sequence[Weather], base: float, start: MonthDay, actual: Mapping[int, date]
) -> tuple[float, float, float | None]:
    """GDD at onset: mean, spread (CV) and leave-one-year-out error in days."""
    series = {y: gdd_series(weather, base, start, y) for y in actual}
    at_onset = {y: series[y].get(actual[y], 0.0) for y in actual}
    mean = statistics.fmean(at_onset.values())
    cv = statistics.pstdev(at_onset.values()) / mean if mean else float("inf")
    errors: list[int] = []
    for year in actual:
        target = statistics.fmean(v for y, v in at_onset.items() if y != year)
        predicted = day_reaching(series[year], target)
        if predicted is not None:
            errors.append(abs((predicted - actual[year]).days))
    return mean, cv, statistics.fmean(errors) if errors else None


def _share_at_least(values: Sequence[float], threshold: float) -> float:
    return sum(v >= threshold for v in values) / len(values)


# --- scenarios ------------------------------------------------------------------


def r0_reference(ctx: Context) -> Outcome:
    """R0: the flows found in the hive data, for transparency (no model needed)."""
    metrics: dict[str, Metric] = {}
    for crop in (LOCUST, SUNFLOWER):
        ref = crop_reference(ctx, crop)
        for (hive, year), f in sorted(ref.main.items(), key=lambda i: i[0][::-1]):
            metrics[f"{crop}_{year}_{hive}"] = (
                f"{f.start.isoformat()}..{f.end.isoformat()} peak {f.peak.isoformat()}"
                f" (ISO wk {f.peak.isocalendar().week}), {f.total_kg:+.1f} kg;"
                f" season {ref.season_kg[(hive, year)]:+.1f} kg"
            )
    status = Status.REPORTED if metrics else Status.INSUFFICIENT
    notes = ("Missing hive-years had no data or no flow in the crop window.",)
    return Outcome(status, metrics, notes)


def s1_locust_onset(ctx: Context) -> Outcome:
    """S1: model black-locust onset (POWER GDD) vs hive spring-flow onset."""
    ref = crop_reference(ctx, LOCUST)
    metrics, errors, notes = _date_errors(ctx, ref, LOCUST, peak=False)
    # Also shown, not gated: the weekly timeline a user sees starts up to 6 days early.
    share = ctx.thresholds.model.bloom_share
    for year in errors:
        first = bloom_weeks(model_weeks(ctx, year, LOCUST) or [], share)[0].starts_on
        observed = ref.ref_date(year)
        metrics[f"{year}_first_blooming_week"] = first.isoformat()
        if observed:
            metrics[f"{year}_week_error_days"] = (first - observed).days
    return _gate((metrics, errors, notes), ctx.thresholds.gates.onset_days)


def s2_year_shift(ctx: Context) -> Outcome:
    """S2: is the model's shift of locust onset between the years the observed one?"""
    years = sorted(ctx.model)
    if len(years) < PAIR:
        return Outcome(Status.INSUFFICIENT, notes=("Needs two years.",))
    first, last = years[0], years[-1]
    ref = crop_reference(ctx, LOCUST)
    m0, m1 = _model_date(ctx, first, LOCUST), _model_date(ctx, last, LOCUST)
    r0, r1 = ref.ref_date(first), ref.ref_date(last)
    metrics: dict[str, Metric] = {}
    inat0, inat1 = _inat_peak(ctx, first), _inat_peak(ctx, last)
    if inat0 and inat1:
        metrics["inat_shift_days"] = _shift(inat0[0], inat1[0])
    if not (m0 and m1 and r0 and r1):
        notes = ("Model or hive onset missing in one of the years.",)
        return Outcome(Status.INSUFFICIENT, metrics, notes)
    model_shift, ref_shift = _shift(m0, m1), _shift(r0, r1)
    diff = model_shift - ref_shift
    limit = ctx.thresholds.gates.shift_days
    metrics |= {
        "years": f"{first}->{last}",
        "model_shift_days": model_shift,
        "hive_shift_days": ref_shift,
        "difference_days": diff,
        "limit_days": limit,
    }
    same_sign = (model_shift > 0) == (ref_shift > 0) or model_shift == ref_shift
    ok = same_sign and abs(diff) <= limit
    return Outcome(Status.PASS if ok else Status.FAIL, metrics)


def s3_gdd_clock(ctx: Context) -> Outcome:
    """S3: is accumulated GDD a better clock for locust onset than the calendar?"""
    t = ctx.thresholds
    weather_years = {w.day.year for w in ctx.weather}
    actual = {
        y: d
        for y, d in crop_reference(ctx, LOCUST).by_year().items()
        if y in weather_years
    }
    if len(actual) < MIN_GDD_YEARS:
        need = (f"Needs >= {MIN_GDD_YEARS} years with hive flows and weather.",)
        return Outcome(Status.INSUFFICIENT, notes=need)
    baseline = statistics.fmean(
        abs((calendar_guess(actual, y) - d).days) for y, d in actual.items()
    )
    metrics: dict[str, Metric] = {
        "years": ",".join(map(str, actual)),
        "calendar_baseline_mae_days": baseline,
    }
    cvs: dict[float, float] = {}
    maes: dict[float, float] = {}
    for base in t.gdd.base_temps_c:
        mean, cvs[base], mae = _gdd_loo(ctx.weather, base, t.gdd.start, actual)
        metrics[f"base{base:g}_gdd_at_onset_mean"] = mean
        metrics[f"base{base:g}_cv"] = cvs[base]
        metrics[f"base{base:g}_loo_mae_days"] = mae
        if mae is not None:
            maes[base] = mae
    if maes:
        best = min(maes, key=lambda b: maes[b])
        metrics["best_base_c"] = best
        metrics["gdd_beats_calendar"] = maes[best] <= baseline
        metrics["gdd_stable"] = cvs[best] < t.gdd.cv_ok
    notes = (
        "Leave-one-year-out: thresholds learnt on the other years predict the "
        "held-out year; calibrate phenology.json the same way, never on the "
        "test year.",
    )
    return Outcome(Status.REPORTED, metrics, notes)


def s4_sunflower_peak(ctx: Context) -> Outcome:
    """S4: model sunflower peak (HLS NDYI) vs hive summer-flow peak."""
    ref = crop_reference(ctx, SUNFLOWER)
    metrics, errors, notes = _date_errors(ctx, ref, SUNFLOWER, peak=True)
    share = ctx.thresholds.model.bloom_share
    for year in sorted(ctx.model):
        weeks = model_weeks(ctx, year, SUNFLOWER)
        if weeks is None:
            continue
        flow_days = {d for (_, y), f in ref.main.items() if y == year for d in f.days()}
        predicted = {w.starts_on for w in bloom_weeks(weeks, share)}
        observed = {
            w.starts_on
            for w in weeks
            if any(
                w.starts_on + timedelta(days=i) in flow_days for i in range(WEEK_DAYS)
            )
        }
        if union := predicted | observed:
            metrics[f"{year}_jaccard"] = len(predicted & observed) / len(union)
    return _gate((metrics, errors, notes), ctx.thresholds.gates.sunflower_peak_days)


def s5_nectar(ctx: Context) -> Outcome:
    """S5: does the low-nectar flag (SMAP) mark the years with weak flows?"""
    metrics: dict[str, Metric] = {}
    notes: list[str] = []
    share = ctx.thresholds.model.bloom_share
    for crop in (LOCUST, SUNFLOWER):
        ref = crop_reference(ctx, crop)
        per_year: dict[int, tuple[float, float]] = {}
        for year in sorted(ctx.model):
            weeks = model_weeks(ctx, year, crop)
            kg = [
                ref.season_kg.get((h, year), 0.0)
                for h in ctx.hives
                if hive_covers(ctx, h, crop, year)
            ]
            if weeks is None or not kg:
                notes.append(f"{crop} {year}: model or hive data missing.")
                continue
            bloom = bloom_weeks(weeks, share) or weeks
            low = statistics.fmean(w.low_nectar for w in bloom)
            per_year[year] = (low, statistics.fmean(kg))
            metrics[f"{crop}_{year}_low_nectar_share"] = low
            metrics[f"{crop}_{year}_hive_flow_kg"] = per_year[year][1]
        if len(per_year) == PAIR:
            (low_a, kg_a), (low_b, kg_b) = per_year.values()
            if low_a != low_b:
                metrics[f"{crop}_ranking_agrees"] = (low_a > low_b) == (kg_a < kg_b)
    notes.append("Two hives in one area: descriptive only, no significance claimed.")
    status = Status.REPORTED if metrics else Status.INSUFFICIENT
    return Outcome(status, metrics, tuple(notes))


def s6_flight_weather(ctx: Context) -> Outcome:
    """S6: do POWER flight-weather days coincide with hive weight gains?"""
    t = ctx.thresholds
    weather = {w.day: w for w in ctx.weather}
    flight: list[float] = []
    grounded: list[float] = []
    for gains in ctx.hives.values():
        for day, gain in gains.items():
            in_season = any(c.contains(day) for c in t.crops.values())
            if gain is None or not in_season or day not in weather:
                continue
            fly = is_flight_day(weather[day], t.flight.tmax_c, t.flight.wind_ms)
            if fly is not None:
                (flight if fly else grounded).append(gain)
    if not flight or not grounded:
        return Outcome(Status.INSUFFICIENT, notes=("No overlap.",))
    grounded_median = statistics.median(grounded)
    flight_gaining = _share_at_least(flight, t.signal.min_flow_day_kg)
    grounded_gaining = _share_at_least(grounded, t.signal.min_flow_day_kg)
    metrics: dict[str, Metric] = {
        "flight_days": len(flight),
        "non_flight_days": len(grounded),
        "flight_median_gain_kg": statistics.median(flight),
        "non_flight_median_gain_kg": grounded_median,
        "flight_share_gaining": flight_gaining,
        "non_flight_share_gaining": grounded_gaining,
        "rule_consistent": grounded_median <= 0 and grounded_gaining < flight_gaining,
    }
    return Outcome(Status.REPORTED, metrics)


def s7_inaturalist(ctx: Context) -> Outcome:
    """S7: model locust peak vs iNaturalist observation peak (any region)."""
    ref = crop_reference(ctx, LOCUST)
    metrics: dict[str, Metric] = {}
    notes: list[str] = []
    compared = 0
    for year in sorted(set(ctx.model) | set(ctx.inat)):
        peak = _inat_peak(ctx, year)
        if peak is None:
            notes.append(f"{year}: fewer than {ctx.thresholds.inat.min_obs} records.")
            continue
        metrics[f"{year}_inat_obs_in_season"] = peak[1]
        metrics[f"{year}_inat_peak"] = peak[0].isoformat()
        if hive := ref.ref_date(year, peak=True):
            metrics[f"{year}_inat_minus_hive_days"] = (peak[0] - hive).days
        if modelled := _model_date(ctx, year, LOCUST, peak=True):
            metrics[f"{year}_model_minus_inat_days"] = (modelled - peak[0]).days
            compared += 1
    if not compared:
        notes.append(
            "No model locust peak to compare; reference agreement still shown."
        )
    status = Status.REPORTED if compared else Status.INSUFFICIENT
    return Outcome(status, metrics, tuple(notes))


def s8_orchards(ctx: Context) -> Outcome:
    """S8: model orchard onset vs PEP725 beginning-of-flowering dates."""
    if not ctx.pep725:
        notes = ("No PEP725 export supplied (--pep725); orchards stay unverified.",)
        return Outcome(Status.INSUFFICIENT, notes=notes)
    metrics: dict[str, Metric] = {}
    compared = 0
    for crop in ORCHARDS:
        for year in sorted(ctx.model):
            days = [r.day for r in ctx.pep725 if r.crop == crop and r.year == year]
            if not days:
                continue
            observed = _median_date(days)
            metrics[f"{crop}_{year}_pep725_onset"] = observed.isoformat()
            metrics[f"{crop}_{year}_records"] = len(days)
            if modelled := _model_date(ctx, year, crop):
                metrics[f"{crop}_{year}_error_days"] = (modelled - observed).days
                compared += 1
    return Outcome(Status.REPORTED if compared else Status.INSUFFICIENT, metrics)


def b0_baseline(ctx: Context) -> Outcome:
    """B0: does the model beat "same date as the other years"?"""
    metrics: dict[str, Metric] = {}
    verdicts: list[bool] = []
    for crop, peak in ((LOCUST, False), (SUNFLOWER, True)):
        ref = crop_reference(ctx, crop)
        observed = ref.by_year(peak=peak)
        _, errors, _ = _date_errors(ctx, ref, crop, peak=peak)
        if not errors or len(observed) < PAIR:
            continue
        model_mae = statistics.fmean(abs(e) for e in errors.values())
        calendar_mae = statistics.fmean(
            abs((calendar_guess(observed, y) - observed[y]).days) for y in errors
        )
        metrics[f"{crop}_model_mae_days"] = model_mae
        metrics[f"{crop}_calendar_mae_days"] = calendar_mae
        verdicts.append(model_mae <= calendar_mae)
    if not verdicts:
        return Outcome(Status.INSUFFICIENT, metrics)
    return Outcome(Status.PASS if all(verdicts) else Status.FAIL, metrics)


SCENARIOS: tuple[Scenario, ...] = (
    Scenario("R0", "Which nectar flows do the reference hives show?", r0_reference),
    Scenario(
        "S1",
        "Does black-locust bloom start when the hives saw the flow start?",
        s1_locust_onset,
    ),
    Scenario(
        "S2",
        "Does the model reproduce the year-to-year shift of the locust flow?",
        s2_year_shift,
    ),
    Scenario(
        "S3",
        "Is accumulated GDD (POWER) a better clock than the calendar?",
        s3_gdd_clock,
    ),
    Scenario(
        "S4", "Does sunflower bloom peak when the summer flow peaks?", s4_sunflower_peak
    ),
    Scenario(
        "S5", "Does the low-nectar flag mark the years with weak flows?", s5_nectar
    ),
    Scenario(
        "S6",
        "Do POWER flight-weather days match the days hives gain weight?",
        s6_flight_weather,
    ),
    Scenario(
        "S7",
        "Does the locust peak match iNaturalist observation peaks?",
        s7_inaturalist,
    ),
    Scenario("S8", "Do orchard onsets match PEP725 flowering dates?", s8_orchards),
    Scenario("B0", "Is the model better than a fixed-calendar baseline?", b0_baseline),
)
