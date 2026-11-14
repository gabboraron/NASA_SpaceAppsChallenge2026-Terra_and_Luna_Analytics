"""Real-data check for WP7: the 2024 NDYI series of the sunflower parcels.

Needs Earthdata credentials in ``.env`` (EARTHDATA_USERNAME / EARTHDATA_PASSWORD or
EARTHDATA_TOKEN). The first run is slow (remote reads); a second run must hit the
per-scene cache and log far fewer reads. Expect NDYI to peak around July.
Run with ``uv run python scripts/hls_series.py``.
"""

import logging
from datetime import date

from pollination.config import Settings
from pollination.datafiles import load_catalog
from pollination.nasa.hls import parcel_indices

log = logging.getLogger(__name__)


def main() -> None:
    """Fetch March-August 2024 observations for the sunflower parcels."""
    parcels = [p for p in load_catalog(Settings()).parcels if p.crop == "sunflower"]
    series = parcel_indices(parcels, date(2024, 3, 1), date(2024, 8, 31))
    for pid, observations in series.items():
        log.info("%s: %d usable observations", pid, len(observations))
        for obs in observations:
            log.info(
                "%s %s NDYI=%.3f NDVI=%.3f valid=%.0f%% %s",
                pid,
                obs.day,
                obs.ndyi,
                obs.ndvi,
                obs.valid_fraction * 100,
                obs.scene_id,
            )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
