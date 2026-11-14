"""Verification scenarios: each compares one NASA-driven output with past data."""

from __future__ import annotations

import statistics
from collections.abc import Iterable, Sequence
from datetime import date, timedelta

from verification.framework import Context, Metric, ModelWeek, Result, Scenario, Status
from verification.signals import (
    Flow,
    bloom_weeks,
    crop_flow,
    day_reaching,
    flows,
    gdd_series,
    has_evidence,
    histogram_peak,
    is_flight_day,
    model_onset,
    model_peak,
)

LOCUST = "black_locust"
SUNFLOWER = "sunflower"
ORCHARDS = ("apple", "sour_cherry")
MIN_GDD_YEARS = 3


# --- shared helpers -------------------------------------------------------------


def _mean_date(days: Sequence[date]) -> date | None:
    """Average date (by ordinal), or None for no dates."""
    if not days:
        return None
    return date.fromordinal(round(statistics.fmean(d.toordinal() for d in days)))


def _doy(day: date) -> int:
    return day.timetuple().tm_yday


def _on_doy(year: int, doy: float) -> date:
    return date(year, 1, 1) + timedelta(days=round(doy) - 1)


def hive_flows(ctx: Context, crop: str) -> dict[tuple[str, int], Flow]:
    """(hive, year) -> the crop's flow, for every hive-year where one was found."""
    s, window = ctx.thresholds.signal, ctx.thresholds.crops[crop]
    found: dict[tuple[str, int], Flow] = {}
    for hive, gains in ctx.hives.items():
        all_flows = flows(gains, s)
        for year in sorted({d.year for d in gains}):
            flow = crop_flow(all_flows, window, year)
            if flow is not None:
                found[(hive, year)] = flow
    return found


def hive_covers(ctx: Context, hive: str, crop: str, year: int) -> bool:
    """Whether a hive has usable data for most of the crop window of a year."""
    window = ctx.thresholds.crops[crop]
    days = [
        d
        for d, g in ctx.hives[hive].items()
        if d.year == year and g is not None and window.contains(d)
    ]
    start, end = (date(year, *map(int, w.split("-"))) for w in window.window)
    return len(days) >= ((end - start).days + 1) / 2


def season_gain(ctx: Context, hive: str, crop: str, year: int) -> float:
    """Total gain of every flow of a hive whose peak lies in the crop window."""
    window = ctx.thresholds.crops[crop]
    return sum(
        f.total_kg
        for f in flows(ctx.hives[hive], ctx.thresholds.signal)
        if f.peak.year == year and window.contains(f.peak)
    )


def ref_date(ctx: Context, crop: str, year: int, *, peak: bool = False) -> date | None:
    """Mean onset (or peak) of the crop's flow over all hives in a year."""
    picked = [
        f.peak if peak else f.start
        for (_, y), f in hive_flows(ctx, crop).items()
        if y == year
    ]
    return _mean_date(picked)


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


def _iso(day: date | None) -> str | None:
    return day.isoformat() if day else None


def _date_errors(
    ctx: Context, crop: str, *, peak: bool
) -> tuple[dict[str, Metric], dict[int, int], list[str]]:
    """Model minus reference (days) per model year, with metrics and notes."""
    metrics: dict[str, Metric] = {}
    errors: dict[int, int] = {}
    notes: list[str] = []
    what = "peak" if peak else "onset"
    for year in sorted(ctx.model):
        modelled = _model_date(ctx, year, crop, peak=peak)
        observed = ref_date(ctx, crop, year, peak=peak)
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


def _gate(
    sid: str,
    found: tuple[dict[str, Metric], dict[int, int], list[str]],
    limit: float,
) -> Result:
    """PASS when every per-year error is within ``limit`` days."""
    metrics, errors, notes = found
    question = Q[sid]
    if not errors:
        return Result(sid, question, Status.INSUFFICIENT, metrics, tuple(notes))
    ok = all(abs(e) <= limit for e in errors.values())
    metrics["limit_days"] = limit
    return Result(
        sid, question, Status.PASS if ok else Status.FAIL, metrics, tuple(notes)
    )


# --- scenarios ------------------------------------------------------------------


def r0_reference(ctx: Context) -> Result:
    """R0: the flows found in the hive data, for transparency (no model needed)."""
    metrics: dict[str, Metric] = {}
    for crop in (LOCUST, SUNFLOWER):
        found = hive_flows(ctx, crop)
        for (hive, year), f in sorted(found.items(), key=lambda i: i[0][::-1]):
            key = f"{crop}_{year}_{hive}"
            metrics[key] = (
                f"{f.start.isoformat()}..{f.end.isoformat()} peak {f.peak.isoformat()}"
                f" (ISO wk {f.peak.isocalendar().week}), {f.total_kg:+.1f} kg;"
                f" season {season_gain(ctx, hive, crop, year):+.1f} kg"
            )
    status = Status.REPORTED if metrics else Status.INSUFFICIENT
    notes = ("Missing hive-years had no data or no flow in the crop window.",)
    return Result("R0", Q["R0"], status, metrics, notes)


def s1_locust_onset(ctx: Context) -> Result:
    """S1: model black-locust onset (POWER GDD) vs hive spring-flow onset."""
    found = _date_errors(ctx, LOCUST, peak=False)
    return _gate("S1", found, ctx.thresholds.gates.onset_days)


def s2_year_shift(ctx: Context) -> Result:
    """S2: is the model's 2024-vs-2022 locust shift the observed one?"""
    years = sorted(ctx.model)
    metrics: dict[str, Metric] = {}
    if len(years) < 2:  # noqa: PLR2004 -- a shift needs two years
        return Result("S2", Q["S2"], Status.INSUFFICIENT, notes=("Needs two years.",))
    first, last = years[0], years[-1]
    m0, m1 = _model_date(ctx, first, LOCUST), _model_date(ctx, last, LOCUST)
    r0, r1 = ref_date(ctx, LOCUST, first), ref_date(ctx, LOCUST, last)
    inat = [_inat_peak(ctx, y) for y in (first, last)]
    if inat[0] and inat[1]:
        metrics["inat_shift_days"] = _shift(inat[0][0], inat[1][0])
    if not (m0 and m1 and r0 and r1):
        notes = ("Model or hive onset missing in one of the years.",)
        return Result("S2", Q["S2"], Status.INSUFFICIENT, metrics, notes)
    model_shift, ref_shift = _shift(m0, m1), _shift(r0, r1)
    diff = model_shift - ref_shift
    metrics |= {
        "years": f"{first}->{last}",
        "model_shift_days": model_shift,
        "hive_shift_days": ref_shift,
        "difference_days": diff,
        "limit_days": ctx.thresholds.gates.shift_days,
    }
    same_sign = (model_shift > 0) == (ref_shift > 0) or model_shift == ref_shift
    ok = same_sign and abs(diff) <= ctx.thresholds.gates.shift_days
    return Result("S2", Q["S2"], Status.PASS if ok else Status.FAIL, metrics)


def _shift(a: date, b: date) -> int:
    """Calendar shift of ``b`` against ``a`` (day of year, years ignored)."""
    return _doy(b) - _doy(a)


def s3_gdd_clock(ctx: Context) -> Result:
    """S3: is accumulated GDD a better clock for locust onset than the calendar?"""
    t = ctx.thresholds
    start = tuple(int(x) for x in t.gdd.start.split("-"))
    onsets: dict[int, list[date]] = {}
    for (_, year), flow in hive_flows(ctx, LOCUST).items():
        onsets.setdefault(year, []).append(flow.start)
    weather_years = {w.day.year for w in ctx.weather}
    years = sorted(y for y in onsets if y in weather_years)
    if len(years) < MIN_GDD_YEARS:
        need = (f"Needs >= {MIN_GDD_YEARS} years with hive flows and weather.",)
        return Result("S3", Q["S3"], Status.INSUFFICIENT, notes=need)
    actual = {y: _mean_date(onsets[y]) or onsets[y][0] for y in years}
    metrics: dict[str, Metric] = {"years": ",".join(map(str, years))}
    baseline = [
        abs(
            (
                _on_doy(y, statistics.fmean(_doy(actual[o]) for o in years if o != y))
                - actual[y]
            ).days
        )
        for y in years
    ]
    metrics["calendar_baseline_mae_days"] = statistics.fmean(baseline)
    best: tuple[float, float] | None = None
    for base in t.gdd.base_temps_c:
        series = {
            y: gdd_series(ctx.weather, base, (start[0], start[1]), y) for y in years
        }
        at_onset = {y: series[y].get(actual[y], 0.0) for y in years}
        values = list(at_onset.values())
        cv = statistics.pstdev(values) / statistics.fmean(values)
        errors: list[int] = []
        for y in years:
            target = statistics.fmean(at_onset[o] for o in years if o != y)
            predicted = day_reaching(series[y], target)
            if predicted is not None:
                errors.append(abs((predicted - actual[y]).days))
        mae = statistics.fmean(errors) if errors else float("nan")
        metrics[f"base{base:g}_gdd_at_onset_mean"] = statistics.fmean(values)
        metrics[f"base{base:g}_cv"] = cv
        metrics[f"base{base:g}_loo_mae_days"] = mae
        if errors and (best is None or mae < best[1]):
            best = (base, mae)
    notes: list[str] = []
    if best is not None:
        metrics["best_base_c"] = best[0]
        beats = best[1] <= metrics["calendar_baseline_mae_days"]
        metrics["gdd_beats_calendar"] = beats
        cv_best = metrics[f"base{best[0]:g}_cv"]
        metrics["gdd_stable"] = isinstance(cv_best, float) and cv_best < t.gdd.cv_ok
        notes.append(
            "Leave-one-year-out: thresholds learnt on the other years predict the "
            "held-out year; calibrate phenology.json the same way, never on the "
            "test year."
        )
    return Result("S3", Q["S3"], Status.REPORTED, metrics, tuple(notes))


def s4_sunflower_peak(ctx: Context) -> Result:
    """S4: model sunflower peak (HLS NDYI) vs hive summer-flow peak."""
    metrics, errors, notes = _date_errors(ctx, SUNFLOWER, peak=True)
    for year in sorted(ctx.model):
        weeks = model_weeks(ctx, year, SUNFLOWER)
        if weeks is None:
            continue
        flow_days = {
            d
            for (_, y), f in hive_flows(ctx, SUNFLOWER).items()
            if y == year
            for d in f.days()
        }
        predicted = {
            w.starts_on for w in bloom_weeks(weeks, ctx.thresholds.model.bloom_share)
        }
        observed = {
            w.starts_on
            for w in weeks
            if any(w.starts_on + timedelta(days=i) in flow_days for i in range(7))
        }
        union = predicted | observed
        if union:
            metrics[f"{year}_jaccard"] = len(predicted & observed) / len(union)
    limit = ctx.thresholds.gates.sunflower_peak_days
    return _gate("S4", (metrics, errors, notes), limit)


def s5_nectar(ctx: Context) -> Result:
    """S5: does the low-nectar flag (SMAP) mark the years with weak flows?"""
    metrics: dict[str, Metric] = {}
    notes: list[str] = []
    share = ctx.thresholds.model.bloom_share
    for crop in (LOCUST, SUNFLOWER):
        per_year: dict[int, tuple[float, float]] = {}
        for year in sorted(ctx.model):
            weeks = model_weeks(ctx, year, crop)
            kg = [
                season_gain(ctx, h, crop, year)
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
        if len(per_year) == 2:  # noqa: PLR2004 -- one pairwise comparison
            (low_a, kg_a), (low_b, kg_b) = per_year.values()
            if low_a != low_b:
                metrics[f"{crop}_ranking_agrees"] = (low_a > low_b) == (kg_a < kg_b)
    status = (
        Status.REPORTED if any("share" in k for k in metrics) else Status.INSUFFICIENT
    )
    notes.append("Two hives in one area: descriptive only, no significance claimed.")
    return Result("S5", Q["S5"], status, metrics, tuple(notes))


def s6_flight_weather(ctx: Context) -> Result:
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
        return Result("S6", Q["S6"], Status.INSUFFICIENT, notes=("No overlap.",))

    def gaining(xs: Iterable[float]) -> float:
        values = list(xs)
        return sum(x >= t.signal.min_flow_day_kg for x in values) / len(values)

    metrics: dict[str, Metric] = {
        "flight_days": len(flight),
        "non_flight_days": len(grounded),
        "flight_median_gain_kg": statistics.median(flight),
        "non_flight_median_gain_kg": statistics.median(grounded),
        "flight_share_gaining": gaining(flight),
        "non_flight_share_gaining": gaining(grounded),
    }
    metrics["rule_consistent"] = statistics.median(grounded) <= 0 and gaining(
        grounded
    ) < gaining(flight)
    return Result("S6", Q["S6"], Status.REPORTED, metrics)


def _inat_peak(ctx: Context, year: int) -> tuple[date, int] | None:
    counts = ctx.inat.get(year)
    window = ctx.thresholds.crops[LOCUST]
    peak = histogram_peak(counts, year, window) if counts else None
    return peak if peak and peak[1] >= ctx.thresholds.inat.min_obs else None


def s7_inaturalist(ctx: Context) -> Result:
    """S7: model locust peak vs iNaturalist observation peak (any region)."""
    metrics: dict[str, Metric] = {}
    notes: list[str] = []
    errors = 0
    for year in sorted(set(ctx.model) | set(ctx.inat)):
        peak = _inat_peak(ctx, year)
        if peak is None:
            notes.append(f"{year}: fewer than {ctx.thresholds.inat.min_obs} records.")
            continue
        metrics[f"{year}_inat_obs_in_season"] = peak[1]
        metrics[f"{year}_inat_peak"] = peak[0].isoformat()
        hive = ref_date(ctx, LOCUST, year, peak=True)
        if hive:
            metrics[f"{year}_inat_minus_hive_days"] = (peak[0] - hive).days
        modelled = _model_date(ctx, year, LOCUST, peak=True)
        if modelled:
            metrics[f"{year}_model_minus_inat_days"] = (modelled - peak[0]).days
            errors += 1
    status = Status.REPORTED if errors else Status.INSUFFICIENT
    if not errors:
        notes.append(
            "No model locust peak to compare; reference agreement still shown."
        )
    return Result("S7", Q["S7"], status, metrics, tuple(notes))


def s8_orchards(ctx: Context) -> Result:
    """S8: model orchard onset vs PEP725 beginning-of-flowering dates."""
    if not ctx.pep725:
        notes = ("No PEP725 export supplied (--pep725); orchards stay unverified.",)
        return Result("S8", Q["S8"], Status.INSUFFICIENT, notes=notes)
    metrics: dict[str, Metric] = {}
    compared = 0
    for crop in ORCHARDS:
        for year in sorted(ctx.model):
            days = [r.day for r in ctx.pep725 if r.crop == crop and r.year == year]
            if not days:
                continue
            observed = date.fromordinal(
                round(statistics.median(d.toordinal() for d in days))
            )
            metrics[f"{crop}_{year}_pep725_onset"] = observed.isoformat()
            metrics[f"{crop}_{year}_records"] = len(days)
            modelled = _model_date(ctx, year, crop)
            if modelled:
                metrics[f"{crop}_{year}_error_days"] = (modelled - observed).days
                compared += 1
    status = Status.REPORTED if compared else Status.INSUFFICIENT
    return Result("S8", Q["S8"], status, metrics)


def b0_baseline(ctx: Context) -> Result:
    """B0: does the model beat "same date as the other years"?"""
    metrics: dict[str, Metric] = {}
    verdicts: list[bool] = []
    for crop, peak in ((LOCUST, False), (SUNFLOWER, True)):
        found = hive_flows(ctx, crop)
        model_err: list[int] = []
        base_err: list[int] = []
        for year in sorted(ctx.model):
            modelled = _model_date(ctx, year, crop, peak=peak)
            observed = ref_date(ctx, crop, year, peak=peak)
            others = [
                _doy(f.peak if peak else f.start)
                for (_, y), f in found.items()
                if y != year
            ]
            if not (modelled and observed and others):
                continue
            model_err.append(abs((modelled - observed).days))
            base_err.append(
                abs((_on_doy(year, statistics.fmean(others)) - observed).days)
            )
        if model_err:
            metrics[f"{crop}_model_mae_days"] = statistics.fmean(model_err)
            metrics[f"{crop}_calendar_mae_days"] = statistics.fmean(base_err)
            verdicts.append(statistics.fmean(model_err) <= statistics.fmean(base_err))
    if not verdicts:
        return Result("B0", Q["B0"], Status.INSUFFICIENT, metrics)
    return Result("B0", Q["B0"], Status.PASS if all(verdicts) else Status.FAIL, metrics)


Q = {
    "R0": "Which nectar flows do the reference hives show?",
    "S1": "Does black-locust bloom start when the hives saw the flow start?",
    "S2": "Does the model reproduce the year-to-year shift of the locust flow?",
    "S3": "Is accumulated GDD (POWER) a better clock than the calendar?",
    "S4": "Does sunflower bloom peak when the summer flow peaks?",
    "S5": "Does the low-nectar flag mark the years with weak flows?",
    "S6": "Do POWER flight-weather days match the days hives gain weight?",
    "S7": "Does the locust peak match iNaturalist observation peaks?",
    "S8": "Do orchard onsets match PEP725 flowering dates?",
    "B0": "Is the model better than a fixed-calendar baseline?",
}

SCENARIOS: tuple[Scenario, ...] = (
    Scenario("R0", Q["R0"], r0_reference),
    Scenario("S1", Q["S1"], s1_locust_onset),
    Scenario("S2", Q["S2"], s2_year_shift),
    Scenario("S3", Q["S3"], s3_gdd_clock),
    Scenario("S4", Q["S4"], s4_sunflower_peak),
    Scenario("S5", Q["S5"], s5_nectar),
    Scenario("S6", Q["S6"], s6_flight_weather),
    Scenario("S7", Q["S7"], s7_inaturalist),
    Scenario("S8", Q["S8"], s8_orchards),
    Scenario("B0", Q["B0"], b0_baseline),
)
