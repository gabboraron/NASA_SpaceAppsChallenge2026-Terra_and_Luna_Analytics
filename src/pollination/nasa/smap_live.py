# pyright: basic
# (basic mode: earthaccess and h5py ship no type stubs)
"""Live NASA access for SMAP L4: CMR search and partial HDF5 reads.

Thin adapter, NOT unit-tested: it needs Earthdata credentials in ``.env`` and
network access, so verify it with a real run (``scripts/smap_season.py``). All logic
lives in :mod:`pollination.nasa.smap`.

h5py reads the remote file through fsspec range requests, so only the HDF5 metadata
and the chunks that hold the requested cell window are transferred, not the granule.
"""

from __future__ import annotations

from collections.abc import Sequence
from contextlib import closing
from datetime import date
from typing import Any, cast

import earthaccess
import h5py
import numpy as np

from pollination.geo import SMAP_COLS, SMAP_ROWS, SmapCell
from pollination.nasa.earthdata import login
from pollination.nasa.smap import DayValues, clean_value

PRODUCT = "SPL4SMGP"
VARIABLE = "Geophysical_Data/sm_rootzone"
# Granules are 3-hourly; the first one at or after 12:00 UTC is the weekly sample.
SAMPLE_WINDOW = ("12:00:00Z", "15:00:00Z")


def read_day(day: date, cells: Sequence[SmapCell]) -> DayValues | None:
    """Read root-zone soil moisture of ``cells`` from the granule at midday UTC.

    Args:
        day: Sample day.
        cells: Cells to read; only their bounding window is transferred.

    Returns:
        Cell id to m3/m3 (None where SMAP has no value), or None if there is no
        granule for that day.

    Raises:
        RuntimeError: If the granule grid is not the global 9 km EASE-Grid 2.0.
    """
    login()
    granules = earthaccess.search_data(
        short_name=PRODUCT,
        temporal=(f"{day}T{SAMPLE_WINDOW[0]}", f"{day}T{SAMPLE_WINDOW[1]}"),
        count=3,
    )
    for granule in sorted(granules, key=lambda g: g["umm"]["GranuleUR"]):
        urls = [u for u in granule.data_links() if u.split("?")[0].endswith(".h5")]
        if not urls:
            continue
        # earthaccess annotates open() as a filesystem; it returns file objects.
        opened: list[Any] = earthaccess.open(urls[:1])  # type: ignore[assignment]  # wrong return annotation upstream
        (remote,) = opened
        with closing(remote), h5py.File(remote, "r") as product:
            moisture = cast(h5py.Dataset, product[VARIABLE])
            if moisture.shape != (SMAP_ROWS, SMAP_COLS):
                raise RuntimeError(f"Unexpected SMAP grid: {moisture.shape}")
            row0, row1 = min(c.row for c in cells), max(c.row for c in cells)
            col0, col1 = min(c.col for c in cells), max(c.col for c in cells)
            window = np.asarray(moisture[row0 : row1 + 1, col0 : col1 + 1])
            return {
                c.id: clean_value(float(window[c.row - row0, c.col - col0]))
                for c in cells
            }
    return None
