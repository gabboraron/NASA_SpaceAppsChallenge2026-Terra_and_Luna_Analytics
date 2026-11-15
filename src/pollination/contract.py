"""API routes.

Every route is real: parcels, Natura 2000, actors, the timeline, grower
verification, the calculator, the matches and the drawn-polygon POWER and HLS routes.
NASA failures become ``Missing`` values with a reason, never errors or made-up data.
"""

import logging
from collections.abc import Callable
from datetime import date
from functools import cache
from threading import Lock
from time import monotonic
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from pollination import models as m
from pollination import state
from pollination.config import Settings
from pollination.datafiles import Catalog, load_catalog
from pollination.engine import calculator
from pollination.engine.matching import match
from pollination.engine.polygon import BASELINE_YEARS, power_response
from pollination.engine.timeline import SeasonInputs, build_timeline, fetch_inputs
from pollination.geo import centroid, to_shape
from pollination.nasa import hls
from pollination.nasa.failure import no_token, reason
from pollination.nasa.power import PowerDaily, daily_point
from pollination.weeks import SEASON_END

log = logging.getLogger(__name__)
router = APIRouter()

HLS_LOOKBACK_DAYS = 30
MAX_POLYGON_SPAN_DEG = 0.1  # about 8 to 11 km: a field, not a region
# Failed season inputs are reused this long, so with NASA down every slider move
# does not wait for the same timeouts again.
RETRY_FAILED_S = 120.0

type PowerFetch = Callable[[float, float, date, date], PowerDaily]
type HlsLatest = Callable[[m.Polygon], m.HlsResponse]


@cache
def catalog() -> Catalog:
    """Load and validate ``data/`` on first use."""
    return load_catalog(Settings())


# Each season's inputs with when they were fetched.
_inputs_by_year: dict[m.Season, tuple[SeasonInputs, float]] = {}
# One lock per season: a slow NASA fetch for one season does not block the other.
_inputs_locks = {year: Lock() for year in m.Season}
# Each season's timeline with the inputs it was built from.
_timelines: dict[m.Season, tuple[SeasonInputs, m.TimelineResponse]] = {}
_timelines_lock = Lock()


def season_inputs(year: m.Season) -> SeasonInputs:
    """Dependency: the season's NASA inputs (tests override it to stay offline).

    Inputs are kept in memory; inputs with a failed request only for
    ``RETRY_FAILED_S``, after which a call fetches again. Concurrent first requests
    wait for one fetch instead of each starting one.
    """
    with _inputs_locks[year]:
        kept = _inputs_by_year.get(year)
        if kept and (not kept[0].failed or monotonic() - kept[1] < RETRY_FAILED_S):
            return kept[0]
        settings = Settings()
        inputs = fetch_inputs(
            year,
            catalog().parcels,
            settings.cache_dir,
            earthdata=settings.has_earthdata,
            phenology=catalog().phenology,
        )
        _inputs_by_year[year] = (inputs, monotonic())
        _timelines.pop(year, None)  # built from the inputs just replaced
        return inputs


def season_timeline(
    year: m.Season, inputs: Annotated[SeasonInputs, Depends(season_inputs)]
) -> m.TimelineResponse:
    """Dependency: the season's timeline.

    It is kept in memory until the inputs are fetched again or the next grower
    verification.
    """
    with _timelines_lock:
        built = _timelines.get(year)
        if built and built[0] is inputs:
            return built[1]
        data = catalog()
        timeline = build_timeline(
            year, data.parcels, data.phenology, inputs, state.verifications
        )
        _timelines[year] = (inputs, timeline)
        return timeline


def power_daily() -> PowerFetch:
    """Dependency: POWER daily series fetcher (tests override it to stay offline)."""
    cache_dir = Settings().cache_dir

    def fetch(lat: float, lon: float, start: date, end: date) -> PowerDaily:
        return daily_point(lat, lon, start, end, cache_dir=cache_dir)

    return fetch


def latest_hls() -> HlsLatest:
    """Dependency: latest HLS scene of a polygon (tests override it)."""
    cache_dir = Settings().cache_dir

    def latest(polygon: m.Polygon) -> m.HlsResponse:
        return hls.latest_for_polygon(polygon, HLS_LOOKBACK_DAYS, cache_dir=cache_dir)

    return latest


@router.get("/parcels")
def parcels() -> list[m.Parcel]:
    """Return illustrative parcel listings."""
    return catalog().parcels


@router.get("/natura2000")
def natura2000() -> m.NaturaCollection:
    """Return the protected-area overlay."""
    return catalog().natura


@router.get("/actors")
def actors() -> m.Actors:
    """Return the synthetic growers and beekeepers."""
    return catalog().actors


@router.get("/timeline")
def timeline(
    timeline: Annotated[m.TimelineResponse, Depends(season_timeline)],
) -> m.TimelineResponse:
    """Return weekly bloom, nectar and evidence for every parcel in a season."""
    return timeline


@router.get("/matches")
def matches(
    beekeeper_id: str,
    week: m.Week,
    timeline: Annotated[m.TimelineResponse, Depends(season_timeline)],
) -> list[m.MatchCard]:
    """Return the beekeeper's candidates for a week: ranked, blocked ones last."""
    data = catalog()
    keeper = next((b for b in data.actors.beekeepers if b.id == beekeeper_id), None)
    if keeper is None:
        return []
    weeks = {w.parcel_id: w for w in timeline.parcel_weeks if w.week == week}
    return match(keeper, data.parcels, weeks, data.calculator, data.ranking)


@router.post("/calculate")
def calculate(inputs: m.CalculatorInput) -> m.CalculatorResult:
    """Return low, base and high scenarios for a move."""
    return calculator.calculate(inputs)


@router.post("/parcels/{id}/verify")
def verify(id: str) -> m.Provenance:
    """Record a simulated grower field photo confirming the parcel's bloom (D16).

    The timeline then reports the parcel's blooming weeks as Observed. The state
    lives in memory and resets when the server restarts.
    """
    if id not in {p.id for p in catalog().parcels}:
        raise HTTPException(status_code=404, detail="Unknown parcel")
    with _timelines_lock:
        state.verifications[id] = m.Provenance(
            kind="Observed",
            source=state.PHOTO_SOURCE,
            observed_at=date.today(),
            note="Simulated in the demo; resets when the server restarts.",
        )
        _timelines.clear()
        return state.verifications[id]


@router.post("/polygon/power")
def power(
    polygon: m.Polygon,
    fetch: Annotated[PowerFetch, Depends(power_daily)],
    year: m.Season = m.Season.COMPARISON,
) -> m.PowerResponse:
    """Return heat units, rain and bee-flight weather at a drawn polygon.

    One POWER node under the polygon's centre serves the season (March to August of
    ``year``) and the 2015-2024 rain baseline; a failed request is a ``Missing``
    value with its reason.
    """
    settings = Settings()
    lon, lat = centroid(polygon)

    def get(start: date, end: date) -> PowerDaily | str:
        try:
            return fetch(lat, lon, start, end)
        except Exception as exc:  # any NASA failure becomes Missing
            log.warning("POWER request for %s failed: %s", (lat, lon), exc)
            return reason("POWER", exc)

    season = get(date(year, 1, 1), date(year, *SEASON_END))
    history = get(date(BASELINE_YEARS[0], 1, 1), date(BASELINE_YEARS[-1], 12, 31))
    return power_response(
        year,
        season,
        history,
        base_temp_c=settings.gdd_base_temp_c,
        min_tmax_c=settings.bee_flight_min_tmax_c,
        max_wind_ms=settings.bee_flight_max_wind_ms,
        baseline_years=BASELINE_YEARS,
    )


@router.post("/polygon/hls")
def hls_latest(
    polygon: m.Polygon, latest: Annotated[HlsLatest, Depends(latest_hls)]
) -> m.HlsResponse:
    """Return the latest usable HLS scene of a drawn polygon (last 30 days).

    Slow on a cold cache (remote reads); needs an Earthdata token.
    """
    if not Settings().has_earthdata:
        return hls.missing_response(no_token("HLS"))
    west, south, east, north = to_shape(polygon).bounds
    if max(east - west, north - south) > MAX_POLYGON_SPAN_DEG:
        return hls.missing_response(
            "Polygon too large for a satellite read; draw one around a single field"
        )
    try:
        return latest(polygon)
    except Exception as exc:  # any NASA failure becomes Missing
        log.warning("HLS request failed: %s", exc)
        return hls.missing_response(reason("HLS", exc))
