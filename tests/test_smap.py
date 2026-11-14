"""Tests for the SMAP client logic (no network): cleaning, percentiles, caching."""

import threading
from collections.abc import Sequence
from datetime import date
from pathlib import Path

import pytest

from pollination.engine.timeline import SmapSeason, week_mid
from pollination.geo import SmapCell
from pollination.nasa.smap import (
    cells_geojson,
    clean_value,
    parse_dap4_csv,
    percentile_rank,
    season,
)

BBOX = (21.6, 47.7, 22.4, 48.05)
FIRST_YEAR = 2015


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (0.25, 0.25),
        (-9999.0, None),  # SMAP fill value
        (float("nan"), None),
        (-0.01, None),  # not a physical volumetric moisture
        (1.2, None),
    ],
)
def test_clean_value(raw: float, expected: float | None) -> None:
    """Fill values, NaN and non-physical moisture become None."""
    assert clean_value(raw) == expected


def test_percentile_rank_mid_rank() -> None:
    """Ties count half, so the median of an odd sample is exactly 50."""
    history = [0.1, 0.2, 0.3, 0.4, 0.5]
    assert percentile_rank(0.3, history, min_years=5) == pytest.approx(50.0)
    assert percentile_rank(0.1, history, min_years=5) == pytest.approx(10.0)
    assert percentile_rank(0.05, history, min_years=5) == pytest.approx(0.0)
    assert percentile_rank(0.9, history, min_years=5) == pytest.approx(100.0)


def test_percentile_rank_needs_enough_history() -> None:
    """Too few baseline years gives no percentile instead of a shaky one."""
    assert percentile_rank(0.3, [0.1, 0.2, 0.3], min_years=5) is None


class Fake:
    """Soil moisture that rises by 0.01 per year, per cell offset; counts reads."""

    def __init__(self, missing_years: set[int] | None = None) -> None:
        self.missing_years = missing_years or set()
        self.reads = 0
        self._lock = threading.Lock()

    def read(
        self, day: date, cells: Sequence[SmapCell]
    ) -> dict[str, float | None] | None:
        """Return ``0.20 + 0.01 * (year - 2015)`` plus 0.001 per column offset."""
        with self._lock:
            self.reads += 1
        if day.year in self.missing_years:
            return None
        base = 0.20 + 0.01 * (day.year - FIRST_YEAR)
        return {c.id: round(base + 0.001 * (c.col % 7), 6) for c in cells}


def run(fake: Fake, tmp_path: Path, year: int = 2022) -> SmapSeason:
    """Build a season with the fake reader and an isolated cache."""
    return season(year, bbox=BBOX, read=fake.read, cache_dir=tmp_path)


def test_season_values_percentiles_and_baseline(tmp_path: Path) -> None:
    """2022 is the 8th driest of 10 years: 7 below it, so percentile 75."""
    result = run(Fake(), tmp_path)
    assert result.baseline == "2015-2024"
    assert result.weeks
    for cell, weeks in result.weeks.items():
        assert set(weeks) == set(range(1, 27))
        week = weeks[1]
        assert week.observed_at == week_mid(2022, 1)
        assert week.value == pytest.approx(0.27 + 0.001 * (cell.col % 7))
        assert week.percentile == pytest.approx(75.0)


def test_season_missing_year_is_reported_in_baseline(tmp_path: Path) -> None:
    """A baseline year with no granule is dropped and named in the baseline note."""
    result = run(Fake(missing_years={2020}), tmp_path)
    assert result.baseline == "2015-2024 (9 of 10 years had data)"
    any_week = next(iter(next(iter(result.weeks.values())).values()))
    assert any_week.percentile == pytest.approx(72.2222, abs=1e-3)  # (6 + 0.5) / 9


def test_season_target_year_without_data(tmp_path: Path) -> None:
    """No granule in the target year gives None values, not made-up ones."""
    result = run(Fake(missing_years={2022}), tmp_path)
    week = next(iter(next(iter(result.weeks.values())).values()))
    assert week.value is None
    assert week.percentile is None


def test_second_season_reuses_the_cache(tmp_path: Path) -> None:
    """The 2024 season shares every baseline read with the 2022 season."""
    fake = Fake()
    run(fake, tmp_path, 2022)
    first_reads = fake.reads
    assert first_reads == 10 * 26  # one granule per week and baseline year
    run(fake, tmp_path, 2024)
    assert fake.reads == first_reads
    run(fake, tmp_path, 2022)
    assert fake.reads == first_reads


def test_cells_geojson() -> None:
    """Cell polygons come out as a GeoJSON FeatureCollection with the cell id."""
    cells = [SmapCell(200, 2000), SmapCell(200, 2001)]
    collection = cells_geojson(cells)
    assert collection["type"] == "FeatureCollection"
    assert [f["properties"]["cell_id"] for f in collection["features"]] == [
        c.id for c in cells
    ]
    assert collection["features"][0]["geometry"]["type"] == "Polygon"


# A real Hyrax DAP4 answer (window [207:210][2159:2162], granule of 2024-06-12).
DAP_CSV = "\n".join(
    [
        "Dataset: SMAP_L4_SM_gph_20240612T103000_Vv8012_001.h5",
        "/Geophysical_Data/sm_rootzone[0], 0.289269, 0.282433, 0.121605, 0.119774",
        "/Geophysical_Data/sm_rootzone[1], 0.275841, 0.264733, 0.117211, 0.110405",
        "/Geophysical_Data/sm_rootzone[2], 0.257042, 0.251488, 0.100152, 0.0961232",
        "/Geophysical_Data/sm_rootzone[3], 0.234704, 0.234765, 0.0888295, 0.0822683",
    ]
)


def test_parse_dap4_csv_rows_and_values() -> None:
    """Each row of the window becomes a list of floats, in row order."""
    rows = parse_dap4_csv(DAP_CSV)
    assert len(rows) == 4  # four rows in the fixture
    assert rows[0] == [0.289269, 0.282433, 0.121605, 0.119774]
    assert rows[3][3] == pytest.approx(0.0822683)


def test_parse_dap4_csv_rejects_an_error_page() -> None:
    """An HTML or error answer is an error, never silently empty data."""
    with pytest.raises(ValueError, match="No sm_rootzone rows"):
        parse_dap4_csv("<html>HTTP Status 400</html>")
