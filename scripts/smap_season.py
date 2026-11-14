"""Real-data check for WP8: SMAP root-zone percentiles of 2022 against 2024.

Needs ``EARTHDATA_TOKEN`` in ``.env``. The first run makes about 260 OPeNDAP
requests (a few seconds each, four in parallel, about 6 minutes); a rerun is
served from the cache. Expect the
2022 summer weeks (June-August, weeks 14-26) to sit at clearly lower percentiles
than 2024. Run with ``uv run python scripts/smap_season.py``.
"""

import logging
from statistics import mean

from pollination.models import Season
from pollination.nasa.smap import season

log = logging.getLogger(__name__)
SUMMER_WEEKS = range(14, 27)


def main() -> None:
    """Build both demo seasons and log their summer percentiles."""
    for year in Season:
        result = season(year)
        log.info("%d baseline %s, %d cells", year, result.baseline, len(result.weeks))
        for week in SUMMER_WEEKS:
            percentiles = [
                w[week].percentile
                for w in result.weeks.values()
                if w[week].percentile is not None
            ]
            log.info(
                "%d week %2d: mean percentile %.0f over %d cells",
                year,
                week,
                mean(percentiles) if percentiles else float("nan"),
                len(percentiles),
            )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
