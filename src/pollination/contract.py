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
from typing import Annotated

import httpx
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
from pollination.nasa.power import PowerDaily, daily_point
from pollination.weeks import SEASON_END

log = logging.getLogger(__name__)
router = APIRouter()

HLS_LOOKBACK_DAYS = 30
MAX_POLYGON_SPAN_DEG = 0.1  # about 8 to 11 km: a field, not a region

type PowerFetch = Callable[[float, float, date, date], PowerDaily]
type HlsLatest = Callable[[m.Polygon], m.HlsResponse]


@cache
def catalog() -> Catalog:
    """Load and validate ``data/`` on first use."""
    return load_catalog(Settings())


_inputs_by_year: dict[m.Season, SeasonInputs] = {}
_inputs_lock = Lock()
_timelines: dict[m.Season, m.TimelineResponse] = {}
_timelines_lock = Lock()


def season_inputs(year: m.Season) -> SeasonInputs:
    """Dependency: the season's NASA inputs (tests override it to stay offline).

    Inputs are kept in memory unless a request failed, so a later call retries.
    Concurrent first requests wait for one fetch instead of each starting one.
    """
    with _inputs_lock:
        if year in _inputs_by_year:
            return _inputs_by_year[year]
        settings = Settings()
        inputs = fetch_inputs(
            year,
            catalog().parcels,
            settings.cache_dir,
            earthdata=settings.has_earthdata,
            phenology=catalog().phenology,
        )
        if not inputs.failed:
            _inputs_by_year[year] = inputs
        return inputs


def season_timeline(
    year: m.Season, inputs: Annotated[SeasonInputs, Depends(season_inputs)]
) -> m.TimelineResponse:
    """Dependency: the season's timeline.

    It is kept in memory while it was built from the kept inputs, until the next
    grower verification.
    """
    with _timelines_lock:
        kept = _inputs_by_year.get(year) is inputs
        if kept and year in _timelines:
            return _timelines[year]
        data = catalog()
        timeline = build_timeline(
            year, data.parcels, data.phenology, inputs, state.verifications
        )
        if kept:
            _timelines[year] = timeline
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
        except httpx.HTTPError as exc:
            log.warning("POWER request for %s failed: %s", (lat, lon), exc)
            return f"NASA POWER request failed ({type(exc).__name__})"

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


def _hls_missing(reason: str) -> m.HlsResponse:
    """An HLS response that says why there is no observation."""
    gap = m.Measurement.missing(hls.SOURCE, reason)
    return m.HlsResponse(observed_at=None, ndvi=gap, ndyi=gap)


@router.post("/polygon/hls")
def hls_latest(
    polygon: m.Polygon, latest: Annotated[HlsLatest, Depends(latest_hls)]
) -> m.HlsResponse:
    """Return the latest usable HLS scene of a drawn polygon (last 30 days).

    Slow on a cold cache (remote reads); needs an Earthdata token.
    """
    if not Settings().has_earthdata:
        return _hls_missing("No Earthdata token configured; HLS not queried")
    west, south, east, north = to_shape(polygon).bounds
    if max(east - west, north - south) > MAX_POLYGON_SPAN_DEG:
        return _hls_missing(
            "Polygon too large for a satellite read; draw one around a single field"
        )
    try:
        return latest(polygon)
    except Exception as exc:  # any NASA failure becomes Missing
        log.warning("HLS request failed: %s", exc)
        return _hls_missing(f"NASA HLS request failed ({type(exc).__name__})")
