"""NASA SMAP L4 root-zone soil moisture per 9 km cell, weekly, with percentiles.

Pure logic: cleaning, percentile ranks, caching and assembling a ``SmapSeason`` for
the timeline engine. Reading a granule is injected and lives in
:mod:`pollination.nasa.smap_live`. One granule per week and year gives every cell of
the region at once, so a baseline of ten years is 260 reads.
"""

from __future__ import annotations

import math
import re
from collections.abc import Callable, Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date
from functools import partial
from pathlib import Path
from typing import Any

from pollination.config import Settings
from pollination.geo import Bbox, SmapCell, smap_cells
from pollination.nasa.cache import get_or_fetch
from pollination.weeks import WEEKS, week_mid

DEFAULT_BASELINE = tuple(range(2015, 2025))
MIN_BASELINE_YEARS = 5  # fewer same-week values than this: no percentile
_WORKERS = 4  # parallel remote reads

type DayValues = dict[str, float | None]
type ReadFn = Callable[[date, Sequence[SmapCell]], DayValues | None]


@dataclass(frozen=True)
class SmapWeek:
    """Root-zone soil moisture of one SMAP cell in one week (output of WP8)."""

    value: float | None  # m3/m3
    percentile: float | None  # 0-100, against the same week of the baseline years
    observed_at: date


@dataclass(frozen=True)
class SmapSeason:
    """SMAP weekly values per cell, with the baseline years used for percentiles."""

    weeks: Mapping[SmapCell, Mapping[int, SmapWeek]]
    baseline: str  # e.g. "2015-2024"


def clean_value(raw: float) -> float | None:
    """Return a volumetric soil moisture in m3/m3, or None for fill and bad values."""
    return raw if math.isfinite(raw) and 0.0 <= raw <= 1.0 else None


def percentile_rank(
    value: float, history: Sequence[float], min_years: int = MIN_BASELINE_YEARS
) -> float | None:
    """Mid-rank percentile (0-100) of ``value`` within ``history``.

    Ties count half, so the median of an odd sample is 50.

    Args:
        value: Value to rank.
        history: Same-week values of the baseline years.
        min_years: Minimum history size to give a percentile at all.

    Returns:
        The percentile, or None if the history is too short.
    """
    if len(history) < min_years:
        return None
    below = sum(h < value for h in history)
    equal = sum(h == value for h in history)
    return 100.0 * (below + 0.5 * equal) / len(history)


def parse_dap4_csv(text: str) -> list[list[float]]:
    """Parse a Hyrax DAP4 ``.dap.csv`` answer for ``sm_rootzone`` into rows.

    Args:
        text: Response body: a ``Dataset:`` line, then one ``name[row], v, v, ...``
            line per row of the requested window.

    Returns:
        One list of floats per window row, in order.

    Raises:
        ValueError: If the text holds no ``sm_rootzone`` rows (e.g. an error page).
    """
    rows = [
        [float(v) for v in line.split(",")[1:]]
        for line in text.splitlines()
        if re.match(r"/Geophysical_Data/sm_rootzone\[\d+\],", line)
    ]
    if not rows:
        raise ValueError("No sm_rootzone rows in the OPeNDAP answer")
    return rows


def _read_cached(
    day: date, cells: Sequence[SmapCell], read: ReadFn, cache_dir: Path | None
) -> DayValues | None:
    """Values of the cells on one sample day, cached (also when there is no granule)."""
    key = {"day": day.isoformat(), "cells": [c.id for c in cells]}

    def fetch() -> dict[str, Any]:
        return {"values": read(day, cells)}

    values: Any = get_or_fetch("smap", key, fetch, cache_dir)["values"]
    return values


def _baseline_label(baseline: Sequence[int], with_data: int) -> str:
    """E.g. ``2015-2024`` or ``2015-2024 (9 of 10 years had data)``."""
    label = f"{min(baseline)}-{max(baseline)}"
    if with_data < len(baseline):
        label += f" ({with_data} of {len(baseline)} years had data)"
    return label


def season(  # noqa: PLR0913  # injectable bbox/read/cache/progress keep it testable
    year: int,
    baseline_years: Sequence[int] = DEFAULT_BASELINE,
    *,
    bbox: Bbox | None = None,
    read: ReadFn | None = None,
    cache_dir: Path | None = None,
    progress: Callable[[int, int], None] | None = None,
) -> SmapSeason:
    """Weekly root-zone soil moisture and percentiles of one year, per SMAP cell.

    Args:
        year: Demo year (e.g. 2022 or 2024).
        baseline_years: Years whose same-week values form each percentile.
        bbox: West, south, east, north; defaults to the configured region.
        read: Granule reader for one sample day; defaults to remote HDF5 reads.
        cache_dir: Cache root; defaults to the configured one.
        progress: Called with (done, total) sample days as the reads go on.

    Returns:
        Value, percentile and observation day for every cell and timeline week,
        and the baseline range actually used.
    """
    cells = smap_cells(bbox or Settings().bbox)
    if read is None:
        from pollination.nasa import smap_live  # noqa: PLC0415  # lazy: needs NASA libs

        read = smap_live.read_day
    years = sorted({*baseline_years, year})
    jobs = [(y, w) for y in years for w in WEEKS]
    fetch = partial(_read_cached, cells=cells, read=read, cache_dir=cache_dir)

    def sample(job: tuple[int, int]) -> DayValues | None:
        return fetch(week_mid(job[0], job[1]))

    data: dict[tuple[int, int], DayValues | None] = {}
    if progress:
        progress(0, len(jobs))
    with ThreadPoolExecutor(max_workers=_WORKERS) as pool:
        for done, (job, values) in enumerate(
            zip(jobs, pool.map(sample, jobs), strict=True), 1
        ):
            data[job] = values
            if progress:
                progress(done, len(jobs))

    with_data = sum(
        any(v is not None for w in WEEKS for v in (data[(y, w)] or {}).values())
        for y in baseline_years
    )
    weeks: dict[SmapCell, dict[int, SmapWeek]] = {}
    for cell in cells:
        weeks[cell] = {}
        for w in WEEKS:
            history = [
                v
                for y in baseline_years
                if (v := (data[(y, w)] or {}).get(cell.id)) is not None
            ]
            value = (data[(year, w)] or {}).get(cell.id)
            percentile = None if value is None else percentile_rank(value, history)
            weeks[cell][w] = SmapWeek(value, percentile, week_mid(year, w))
    return SmapSeason(weeks, _baseline_label(baseline_years, with_data))
