"""Warm the NASA cache for the demo seasons (plan WP14, decision D2).

Runs the same live code paths as the API (``fetch_inputs`` for POWER and HLS,
``smap.season`` for SMAP) for every seed parcel and the SMAP cells of the region, so
the demo never waits on NASA. Idempotent: whatever is cached is not fetched again,
so an interrupted run just continues, and a second run is near-instant.

Needs ``EARTHDATA_TOKEN`` in ``.env``. Run from the repository root::

    uv run python scripts/warm_cache.py
    uv run python scripts/warm_cache.py --years 2024 --only smap

The two lanes (POWER + HLS, and SMAP) run in parallel because they talk to different
servers. To share the result with the team see ``pollination.nasa.cache_share``.
"""

import argparse
import logging
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from pollination.config import Settings
from pollination.datafiles import Catalog, load_catalog
from pollination.engine.timeline import fetch_inputs
from pollination.nasa import smap

log = logging.getLogger(__name__)
DEMO_YEARS = (2022, 2024)
NAMESPACES = ("power", "hls", "smap")


def entries(settings: Settings) -> dict[str, int]:
    """Count cache entries per namespace."""
    return {
        ns: sum(1 for _ in (settings.cache_dir / ns).glob("*.json"))
        for ns in NAMESPACES
    }


def warm_inputs(year: int, settings: Settings, catalog: Catalog) -> list[str]:
    """Fetch POWER and HLS for one season exactly as the API does; list problems."""
    inputs = fetch_inputs(
        year,
        catalog.parcels,
        settings.cache_dir,
        earthdata=True,
        phenology=catalog.phenology,
    )
    problems = [
        f"{year} POWER {pid}: {v}"
        for pid, v in inputs.power.items()
        if isinstance(v, str)
    ]
    if isinstance(inputs.hls, str):
        problems.append(f"{year} HLS: {inputs.hls}")
    if inputs.failed and not problems:
        problems.append(f"{year}: a NASA request failed (see the log above)")
    return problems


def warm_smap(year: int, _settings: Settings, _catalog: Catalog) -> list[str]:
    """Fetch SMAP weekly values and percentiles for one season; list problems."""
    season = smap.season(year)
    if all(w.value is None for weeks in season.weeks.values() for w in weeks.values()):
        return [f"{year} SMAP: no value in any cell and week"]
    return []


def lane(
    name: str,
    years: list[int],
    work: Callable[[int, Settings, Catalog], list[str]],
    settings: Settings,
    catalog: Catalog,
) -> list[str]:
    """Run ``work`` for each year, logging durations; errors become problems."""
    problems: list[str] = []
    for year in years:
        started = time.perf_counter()
        try:
            found = work(year, settings, catalog)
        except Exception as exc:  # keep the other lane running
            log.exception("%s %d failed", name, year)
            found = [f"{year} {name}: {type(exc).__name__}: {exc}"]
        log.info(
            "%s %d finished in %.1f min",
            name,
            year,
            (time.perf_counter() - started) / 60,
        )
        problems += found
    return problems


def main() -> None:
    """Warm the cache; exit non-zero if any source could not be fetched."""
    parser = argparse.ArgumentParser(description="Warm the NASA cache for the demo")
    parser.add_argument("--years", type=int, nargs="+", default=list(DEMO_YEARS))
    parser.add_argument("--only", choices=("inputs", "smap"), help="run one lane only")
    args = parser.parse_args()
    settings = Settings()
    if settings.earthdata_token is None:
        raise SystemExit("EARTHDATA_TOKEN is missing in .env; HLS and SMAP need it")
    catalog = load_catalog(settings)
    lanes = {"inputs": ("POWER+HLS", warm_inputs), "smap": ("SMAP", warm_smap)}
    chosen = [args.only] if args.only else list(lanes)
    before, started = entries(settings), time.perf_counter()
    log.info("warming %s for %s; cache before: %s", chosen, args.years, before)
    with ThreadPoolExecutor(max_workers=len(chosen)) as pool:
        futures = [
            pool.submit(lane, lanes[k][0], args.years, lanes[k][1], settings, catalog)
            for k in chosen
        ]
        problems = [p for future in futures for p in future.result()]
    after = entries(settings)
    log.info(
        "total %.1f min; new entries %s",
        (time.perf_counter() - started) / 60,
        {k: after[k] - before[k] for k in after},
    )
    if problems:
        raise SystemExit("Not everything was fetched:\n" + "\n".join(problems))


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    main()
