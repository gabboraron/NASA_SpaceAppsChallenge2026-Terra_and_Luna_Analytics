"""Past ground truth: hive-scale weights, iNaturalist counts, optional PEP725 dates.

Downloads go to ``<cache>/verification`` and are checked against pinned SHA-256
hashes, so every run compares against the same bytes.
"""

from __future__ import annotations

import csv
import hashlib
import io
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
from openpyxl import load_workbook

from pollination.geo import haversine_km
from pollination.nasa.cache import get_or_fetch
from verification.framework import PhenoRecord, Thresholds

TIMEOUT_S = 120.0
MENDELEY = "https://data.mendeley.com/public-files/datasets/3v3hhkddmz/files"
INAT_HISTOGRAM = "https://api.inaturalist.org/v1/observations/histogram"
USER_AGENT = "pollination-verification (NASA Space Apps 2026 project)"


@dataclass(frozen=True)
class HiveFile:
    """One file of the hive-scale dataset (Mendeley Data 10.17632/3v3hhkddmz.1)."""

    hive: str
    name: str
    file_id: str
    sha256: str

    @property
    def url(self) -> str:
        """Public download URL."""
        return f"{MENDELEY}/{self.file_id}/file_downloaded"


HIVE_FILES = (
    HiveFile(
        "hive12",
        "Debrecen_Hive_12.xlsx",
        "16caa0a5-4c59-403d-a113-232dba032c1b",
        "2829004900a89e796abb959e4b6dcace9de7d5c7af35c586f0fa4982f34edc59",
    ),
    HiveFile(
        "hive18",
        "Debrecen_Hive_18.csv",
        "a50fd08b-6249-49f9-b001-1fa9fbe93730",
        "96a90814128ff7e8dab546d747070771669a0fb96e5641be633842ef42058e09",
    ),
)


def download(hf: HiveFile, folder: Path) -> Path:
    """Download a hive file once and verify its hash.

    Raises:
        ValueError: The file on disk or on the server has another hash.
        httpx.HTTPError: The download failed.
    """
    path = folder / hf.name
    if not path.exists():
        folder.mkdir(parents=True, exist_ok=True)
        response = httpx.get(
            hf.url,
            follow_redirects=True,
            timeout=TIMEOUT_S,
            headers={"User-Agent": USER_AGENT},
        )
        response.raise_for_status()
        path.write_bytes(response.content)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != hf.sha256:
        raise ValueError(f"{path} has sha256 {digest}, expected {hf.sha256}")
    return path


def read_hive(path: Path) -> list[tuple[datetime, float]]:
    """Parse a hive file (CSV or XLSX) into (timestamp, weight kg) readings.

    Rows with an unparsable time or weight are skipped.
    """
    rows = _xlsx_rows(path) if path.suffix == ".xlsx" else _csv_rows(path)
    readings: list[tuple[datetime, float]] = []
    for ts, weight in rows:
        try:
            when = ts if isinstance(ts, datetime) else datetime.fromisoformat(str(ts))
            readings.append((when, float(str(weight))))
        except ValueError:
            continue
    return readings


def _csv_rows(path: Path) -> Iterator[tuple[object, object]]:
    """Yield (time, weight) from the CSV; each line is itself wrapped in quotes."""
    with path.open(encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if line.startswith('"') and line.endswith('"'):
                line = line[1:-1].replace('""', '"')
            row = next(csv.reader(io.StringIO(line)), list[str]())
            if len(row) >= 2:  # noqa: PLR2004 -- time and weight columns
                yield row[0], row[1]


def _xlsx_rows(path: Path) -> Iterator[tuple[object, object]]:
    """Yield (time, weight) from every yearly sheet of the workbook."""
    workbook = load_workbook(path, read_only=True)
    try:
        for sheet in workbook.worksheets:
            for row in sheet.iter_rows(min_row=2, values_only=True):
                if len(row) >= 2:  # noqa: PLR2004 -- time and weight columns
                    yield row[0], row[1]
    finally:
        workbook.close()


def inat_histogram(year: int, t: Thresholds, cache_dir: Path) -> dict[int, int]:
    """Weekly research-grade observation counts of the iNaturalist taxon.

    Returns:
        ISO week -> count for ``year`` inside ``t.inat.bbox``.

    Raises:
        httpx.HTTPError: The request failed.
    """
    west, south, east, north = t.inat.bbox
    query: dict[str, Any] = {
        "taxon_id": t.inat.taxon_id,
        "swlng": west,
        "swlat": south,
        "nelng": east,
        "nelat": north,
        "year": year,
        "interval": "week_of_year",
        "date_field": "observed",
        "quality_grade": "research",
    }

    def fetch() -> dict[str, Any]:
        response = httpx.get(
            INAT_HISTOGRAM,
            params=query,
            timeout=TIMEOUT_S,
            headers={"User-Agent": USER_AGENT},
        )
        response.raise_for_status()
        return response.json()

    payload = get_or_fetch("inaturalist", query, fetch, cache_dir)
    weeks: dict[str, int] = payload["results"]["week_of_year"]
    return {int(k): int(v) for k, v in weeks.items()}


def read_pep725(path: Path, t: Thresholds) -> list[PhenoRecord]:
    """Read a normalised PEP725 export near the reference location.

    The CSV needs the columns ``crop,year,bbch,doy,lon,lat`` (crop as used in
    ``data/parcels.geojson``, e.g. ``apple``). Rows outside
    ``t.pep725.radius_km`` or with another BBCH code are dropped.
    """
    records: list[PhenoRecord] = []
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            lon, lat = float(row["lon"]), float(row["lat"])
            bbch, year = int(row["bbch"]), int(row["year"])
            far = haversine_km((lon, lat), t.reference_location) > t.pep725.radius_km
            if far or bbch not in t.pep725.bbch:
                continue
            day = date(year, 1, 1) + timedelta(days=int(row["doy"]) - 1)
            records.append(PhenoRecord(row["crop"], year, bbch, day, lon, lat))
    return records
