"""POWER indicators of a drawn polygon: heat units, rain and bee-flight weather.

A drawn polygon has no crop, so the heat-unit base temperature is a generic setting,
and every number carries a provenance that says so. A failed or empty NASA answer
becomes a ``Missing`` value with its reason, never a made-up number.
"""

from collections.abc import Sequence
from datetime import date

from pollination import models as m
from pollination.engine.phenology import accumulate
from pollination.nasa.power import PowerDaily

SOURCE = "NASA POWER daily (MERRA-2)"
BASELINE_YEARS = tuple(range(2015, 2025))  # same baseline as the SMAP percentiles
MIN_BASELINE_YEARS = 5  # fewer same-period totals than this: no anomaly
MIN_BASELINE_COVERAGE = 0.9  # share of a baseline year's days that must have rain data


def _count(n: int, unit: str) -> str:
    """``1 day`` / ``3 days``."""
    return f"{n} {unit}" if n == 1 else f"{n} {unit}s"


def _missing(reason: str) -> m.Measurement:
    """A measurement that is absent, with the reason."""
    provenance = m.Provenance(
        kind="Missing", source=SOURCE, observed_at=None, note=reason
    )
    return m.Measurement(value=None, provenance=provenance)


def _estimated(value: float, last: date, note: str) -> m.Measurement:
    """A POWER-derived measurement (reanalysis, so Estimated) up to ``last``."""
    provenance = m.Provenance(
        kind="Estimated", source=SOURCE, observed_at=last, note=note
    )
    return m.Measurement(value=value, provenance=provenance)


def _all_missing(reason: str) -> m.PowerResponse:
    """The response when the season's POWER series is unavailable."""
    gap = _missing(reason)
    return m.PowerResponse(
        gdd_series=[],
        gdd_provenance=gap.provenance,
        precipitation_total_mm=gap,
        precipitation_anomaly_mm=gap,
        bee_flight_weather_days=gap,
    )


def _rain_total(daily: PowerDaily, start: date, end: date) -> tuple[float, int, int]:
    """Rain total, days summed and days without a value between two days."""
    values = [
        v
        for d, v in zip(daily.days, daily.values["PRECTOTCORR"], strict=True)
        if start <= d <= end
    ]
    present = [v for v in values if v is not None]
    return sum(present), len(present), len(values) - len(present)


def _anomaly(
    total: float,
    last: date,
    history: PowerDaily | str,
    baseline_years: Sequence[int],
) -> m.Measurement:
    """Rain of this season so far minus the mean of the same days in other years."""
    if isinstance(history, str):
        return _missing(f"No baseline for the anomaly: {history}")
    totals: dict[int, float] = {}
    for year in baseline_years:
        start, end = date(year, 3, 1), date(year, last.month, last.day)
        rain, present, absent = _rain_total(history, start, end)
        if present and present / (present + absent) >= MIN_BASELINE_COVERAGE:
            totals[year] = rain
    if len(totals) < MIN_BASELINE_YEARS:
        return _missing(
            f"Only {_count(len(totals), 'year')} of POWER data in the baseline "
            f"(at least {MIN_BASELINE_YEARS} needed)"
        )
    mean = sum(totals.values()) / len(totals)
    note = (
        f"Against the mean of {_count(len(totals), 'year')} "
        f"{min(totals)}-{max(totals)} over the same days (1 Mar - {last:%d %b})"
    )
    return _estimated(total - mean, last, note)


def power_response(  # noqa: PLR0913  # the season, its baseline and three thresholds
    year: int,
    daily: PowerDaily | str,
    history: PowerDaily | str,
    *,
    base_temp_c: float,
    min_tmax_c: float,
    max_wind_ms: float,
    baseline_years: Sequence[int],
) -> m.PowerResponse:
    """Heat units, rain and flight weather of March to August at one POWER node.

    Args:
        year: Season.
        daily: POWER series covering the season, or why it is missing.
        history: Long POWER series for the rain baseline, or why it is missing.
        base_temp_c: Generic heat-unit base temperature (the crop is not known).
        min_tmax_c: Lowest daily maximum at which bees fly.
        max_wind_ms: Wind speed (2 m) at or above which bees stay in.
        baseline_years: Years whose same-period rain forms the anomaly baseline.

    Returns:
        The indicators; any that cannot be computed are ``Missing`` with a reason.
    """
    if isinstance(daily, str):
        return _all_missing(daily)
    start, end = date(year, 3, 1), date(year, 8, 31)
    days = [d for d in daily.days if start <= d <= end]
    if not days:
        return _all_missing("NASA POWER returned no days for this season")
    last = days[-1]

    heat = accumulate(
        daily.days,
        daily.values["T2M_MAX"],
        daily.values["T2M_MIN"],
        base_temp_c,
        start,
    )
    note = (
        f"Cumulative from 1 Mar at base {base_temp_c:g} C; the crop of a drawn "
        "polygon is not known, so the base is generic"
    )
    if heat.missing_days:
        note += f"; {_count(heat.missing_days, 'day')} without temperature counted as 0"
    gdd_series = [
        m.GddPoint(day=d, gdd=t)
        for d, t in zip(heat.days, heat.totals, strict=True)
        if d <= end
    ]
    gdd_provenance = m.Provenance(
        kind="Estimated", source=SOURCE, observed_at=last, note=note
    )

    rain, present, absent = _rain_total(daily, start, end)
    if present:
        rain_note = f"Sum of {_count(present, 'day')} from 1 Mar"
        if absent:
            rain_note += f"; {_count(absent, 'day')} without data"
        total = _estimated(rain, last, rain_note)
        anomaly = _anomaly(rain, last, history, baseline_years)
    else:
        total = anomaly = _missing("NASA POWER has no precipitation for this season")

    flying = unknown = 0
    for d, tmax, wind in zip(
        daily.days, daily.values["T2M_MAX"], daily.values["WS2M"], strict=True
    ):
        if not start <= d <= end:
            continue
        if tmax is None or wind is None:
            unknown += 1
        elif tmax >= min_tmax_c and wind < max_wind_ms:
            flying += 1
    flight_note = (
        f"Days from 1 Mar with Tmax >= {min_tmax_c:g} C and 2 m wind < "
        f"{max_wind_ms:g} m/s"
    )
    if unknown:
        flight_note += (
            f"; {_count(unknown, 'day')} without temperature or wind not counted"
        )
    return m.PowerResponse(
        gdd_series=gdd_series,
        gdd_provenance=gdd_provenance,
        precipitation_total_mm=total,
        precipitation_anomaly_mm=anomaly,
        bee_flight_weather_days=_estimated(float(flying), last, flight_note),
    )
