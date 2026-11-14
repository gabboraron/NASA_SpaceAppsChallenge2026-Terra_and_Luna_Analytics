# pyright: basic
# (basic mode: earthaccess ships no type stubs)
"""Live NASA access for SMAP L4: CMR search and OPeNDAP window subsetting.

Thin adapter, NOT unit-tested: it needs ``EARTHDATA_TOKEN`` in ``.env`` and network
access, so verify it with a real run (``scripts/smap_season.py``). All logic lives in
:mod:`pollination.nasa.smap`.

``sm_rootzone`` is stored as ONE gzip chunk spanning the whole global grid (about
4 MB compressed in a 146 MB granule), so reading a cell window over HDF5 range
requests still moves tens of MB and took about 27 s per granule. The NSIDC Hyrax
OPeNDAP service (listed in each granule's ``RelatedUrls``) cuts the window on the
server instead: a few hundred bytes in about two seconds.
"""

from __future__ import annotations

import os
import time
from collections.abc import Sequence
from datetime import date

import earthaccess
import httpx

from pollination.geo import SmapCell
from pollination.nasa.earthdata import login
from pollination.nasa.smap import DayValues, clean_value, parse_dap4_csv

PRODUCT = "SPL4SMGP"
VARIABLE = "/Geophysical_Data/sm_rootzone"
# CMR returns the granules whose period overlaps this span; the earliest one (the
# 10:30 UTC granule, covering 09:00-12:00) is the weekly sample.
SAMPLE_WINDOW = ("12:00:00Z", "15:00:00Z")
HTTP_TIMEOUT_S = 120
ATTEMPTS = 5
BACKOFF_S = 2.0
RETRY_STATUSES = (429, 500, 502, 503, 504)
_CLIENT = httpx.Client(
    timeout=HTTP_TIMEOUT_S,
    limits=httpx.Limits(max_connections=8, max_keepalive_connections=8),
)


def _get_csv(base_url: str, constraint: str) -> str:
    """GET a DAP4 CSV subset with the bearer token, retrying transient failures."""
    token = os.environ.get("EARTHDATA_TOKEN")
    if not token:
        raise RuntimeError("EARTHDATA_TOKEN is required in .env for SMAP OPeNDAP")
    for attempt in range(ATTEMPTS):
        try:
            response = _CLIENT.get(
                f"{base_url}.dap.csv",
                params={"dap4.ce": constraint},
                headers={"Authorization": f"Bearer {token}"},
                follow_redirects=True,
            )
        except httpx.TransportError:
            if attempt == ATTEMPTS - 1:
                raise
        else:
            if response.status_code == httpx.codes.OK:
                return response.text
            if response.status_code not in RETRY_STATUSES:
                raise RuntimeError(
                    f"OPeNDAP answered {response.status_code}: {response.text[:200]}"
                )
        time.sleep(BACKOFF_S * 2**attempt)
    raise RuntimeError(f"OPeNDAP gave no answer after {ATTEMPTS} attempts")


def read_day(day: date, cells: Sequence[SmapCell]) -> DayValues | None:
    """Read root-zone soil moisture of ``cells`` from the granule at midday UTC.

    Args:
        day: Sample day.
        cells: Cells to read; the server sends only their bounding window.

    Returns:
        Cell id to m3/m3 (None where SMAP has no value), or None if there is no
        granule for that day.

    Raises:
        RuntimeError: If the OPeNDAP answer does not have the requested shape.
    """
    login()
    granules = earthaccess.search_data(
        short_name=PRODUCT,
        temporal=(f"{day}T{SAMPLE_WINDOW[0]}", f"{day}T{SAMPLE_WINDOW[1]}"),
        count=3,
    )
    for granule in sorted(granules, key=lambda g: g["umm"]["GranuleUR"]):
        base = next(
            (
                u["URL"]
                for u in granule["umm"].get("RelatedUrls", [])
                if u.get("Subtype") == "OPENDAP DATA"
            ),
            None,
        )
        if base is None:
            continue
        row0, row1 = min(c.row for c in cells), max(c.row for c in cells)
        col0, col1 = min(c.col for c in cells), max(c.col for c in cells)
        rows = parse_dap4_csv(
            _get_csv(base, f"{VARIABLE}[{row0}:{row1}][{col0}:{col1}]")
        )
        if len(rows) != row1 - row0 + 1 or any(len(r) != col1 - col0 + 1 for r in rows):
            raise RuntimeError(f"Unexpected OPeNDAP window shape for {day}")
        return {c.id: clean_value(rows[c.row - row0][c.col - col0]) for c in cells}
    return None
