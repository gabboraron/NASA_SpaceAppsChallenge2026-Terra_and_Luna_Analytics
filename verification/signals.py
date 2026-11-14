"""Pure signal extraction: hive weights to flows, timelines to windows, GDD, peaks."""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from verification.framework import CropWindow, ModelWeek, SignalSettings, Weather

PEAK_HALF_WIDTH_DAYS = 3  # a peak is the centre of the best 7-day sum


# --- hive weights -------------------------------------------------------------


def daily_gains(
    readings: Iterable[tuple[datetime, float]], s: SignalSettings
) -> dict[date, float | None]:
    """Net weight change of each foraging day from night-time readings.

    The colony is home and still at night, so the last reading before
    ``night_hour_end`` is the day's resting weight. The gain of day ``d`` is the
    resting weight on the following night minus the one on the night before.

    Args:
        readings: (timestamp, weight in kg) pairs in any order.
        s: Signal settings.

    Returns:
        Foraging day -> gain in kg; ``None`` for jumps above
        ``max_daily_jump_kg`` (supers added, honey harvested, hive moved).
    """
    night: dict[date, tuple[datetime, float]] = {}
    for ts, weight in readings:
        if ts.hour < s.night_hour_end:
            best = night.get(ts.date())
            if best is None or ts > best[0]:
                night[ts.date()] = (ts, weight)
    gains: dict[date, float | None] = {}
    for day in sorted(night):
        after = night.get(day + timedelta(days=1))
        if after is None:
            continue
        change = after[1] - night[day][1]
        gains[day] = None if abs(change) > s.max_daily_jump_kg else change
    return gains


@dataclass(frozen=True)
class Flow:
    """A nectar flow: a run of foraging days with net weight gain."""

    start: date
    end: date
    peak: date
    total_kg: float

    def days(self) -> set[date]:
        """Return every day of the flow."""
        return {
            self.start + timedelta(days=i)
            for i in range((self.end - self.start).days + 1)
        }


def flows(gains: Mapping[date, float | None], s: SignalSettings) -> list[Flow]:
    """Group flow days into flows.

    A flow day gains at least ``min_flow_day_kg``. Up to ``max_gap_days`` other
    days (rain, cold) may interrupt a flow; a day without data ends it. Flows
    totalling less than ``min_flow_total_kg`` are dropped.

    Args:
        gains: Output of :func:`daily_gains`.
        s: Signal settings.

    Returns:
        Flows in time order.
    """
    runs: list[list[date]] = []
    current: list[date] = []
    gap = 0
    for day in sorted(gains):
        gain = gains[day]
        contiguous = bool(current) and day == current[-1] + timedelta(days=gap + 1)
        if gain is not None and gain >= s.min_flow_day_kg:
            if not contiguous:
                current = []
                runs.append(current)
            current.append(day)
            gap = 0
        elif contiguous and gain is not None and gap < s.max_gap_days:
            gap += 1
        else:
            current, gap = [], 0
    result: list[Flow] = []
    for run in runs:
        start, end = run[0], run[-1]
        span = [start + timedelta(days=i) for i in range((end - start).days + 1)]
        total = sum(gains.get(d) or 0.0 for d in span)
        if total >= s.min_flow_total_kg:
            result.append(Flow(start, end, _peak(span, gains), total))
    return result


def _peak(span: Sequence[date], gains: Mapping[date, float | None]) -> date:
    """Return the centre day of the best 7-day gain inside a flow."""

    def window_sum(centre: date) -> float:
        offsets = range(-PEAK_HALF_WIDTH_DAYS, PEAK_HALF_WIDTH_DAYS + 1)
        return sum(gains.get(centre + timedelta(days=o)) or 0.0 for o in offsets)

    return max(span, key=window_sum)


def crop_flow(all_flows: Iterable[Flow], window: CropWindow, year: int) -> Flow | None:
    """Return the largest flow of ``year`` whose peak lies in the crop window."""
    candidates = [
        f for f in all_flows if f.peak.year == year and window.contains(f.peak)
    ]
    return max(candidates, key=lambda f: f.total_kg, default=None)


# --- model timeline -----------------------------------------------------------

WEEK_MID_DAYS = 3


def bloom_weeks(weeks: Sequence[ModelWeek], share: float) -> list[ModelWeek]:
    """Return the weeks in which at least ``share`` of the parcels bloom."""
    return [w for w in weeks if w.parcels and w.blooming >= share]


def model_onset(weeks: Sequence[ModelWeek], share: float) -> date | None:
    """First day of the first blooming week, or None if the crop never blooms."""
    blooming = bloom_weeks(weeks, share)
    return blooming[0].starts_on if blooming else None


def model_peak(weeks: Sequence[ModelWeek], share: float) -> date | None:
    """Middle of the week with the highest blooming share (first if tied)."""
    blooming = bloom_weeks(weeks, share)
    if not blooming:
        return None
    best = max(blooming, key=lambda w: w.blooming)
    return best.starts_on + timedelta(days=WEEK_MID_DAYS)


def has_evidence(weeks: Sequence[ModelWeek]) -> bool:
    """Return whether any week of the crop has a non-Missing bloom value."""
    return any(w.parcels and w.missing < 1.0 for w in weeks)


# --- weather ------------------------------------------------------------------


def gdd_series(
    weather: Iterable[Weather], base_c: float, start: tuple[int, int], year: int
) -> dict[date, float]:
    """Accumulated growing degree days of one year from ``start`` (month, day).

    Uses the daily mean ``(Tmax + Tmin) / 2`` minus ``base_c``, floored at zero.
    A day with a missing temperature adds nothing.

    Returns:
        Day -> accumulated GDD, in date order.
    """
    first = date(year, *start)
    total = 0.0
    series: dict[date, float] = {}
    for w in sorted(weather, key=lambda w: w.day):
        if w.day.year != year or w.day < first:
            continue
        if w.tmax is not None and w.tmin is not None:
            total += max(0.0, (w.tmax + w.tmin) / 2 - base_c)
        series[w.day] = total
    return series


def day_reaching(series: Mapping[date, float], target: float) -> date | None:
    """First day the accumulated series reaches ``target``."""
    return next((d for d, v in series.items() if v >= target), None)


def is_flight_day(w: Weather, tmax_c: float, wind_ms: float) -> bool | None:
    """Plan WP13 rule: Tmax >= threshold and mean wind below threshold."""
    if w.tmax is None or w.wind is None:
        return None
    return w.tmax >= tmax_c and w.wind < wind_ms


# --- iNaturalist --------------------------------------------------------------


def iso_week_mid(year: int, week: int) -> date:
    """Thursday (middle) of an ISO week."""
    return date.fromisocalendar(year, week, 4)


def histogram_peak(
    counts: Mapping[int, int], year: int, window: CropWindow
) -> tuple[date, int] | None:
    """Peak of a weekly count histogram inside a crop window, smoothed over 3 weeks.

    Observations outside the window (seed pods, leaves) are ignored.

    Args:
        counts: ISO week -> observation count.
        year: Year of the histogram.
        window: Calendar window of the crop's bloom season.

    Returns:
        (middle of the peak week, observations in the window), or None if none.
    """
    last = date(year, 12, 28).isocalendar().week
    weeks = [
        w for w in counts if 1 <= w <= last and window.contains(iso_week_mid(year, w))
    ]
    total = sum(counts[w] for w in weeks)
    if total == 0:
        return None

    def smoothed(w: int) -> int:
        return sum(counts.get(w + o, 0) for o in (-1, 0, 1) if w + o in weeks)

    best = max(sorted(weeks), key=smoothed)
    return iso_week_mid(year, best), total
