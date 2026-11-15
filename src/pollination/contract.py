"""API routes.

Every route is real: parcels, Natura 2000, actors, the timeline, grower
verification, the calculator, the matches (for a synthetic beekeeper or a signed-in
one's own profile) and the drawn-polygon POWER, HLS and bloom-timeline routes.
NASA failures become ``Missing`` values with a reason, never errors or made-up data.
"""

import json
import logging
from collections import defaultdict
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from functools import cache, partial
from pathlib import Path
from threading import Lock, Thread
from time import monotonic
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from pollination import models as m
from pollination import state, worker
from pollination.config import Settings
from pollination.datafiles import CalculatorDefaults, Catalog, load_catalog
from pollination.engine import calculator
from pollination.engine.matching import match
from pollination.engine.polygon import BASELINE_YEARS, power_response
from pollination.engine.timeline import (
    SeasonInputs,
    build_timeline,
    fetch_inputs,
    parcel_power,
    parcel_weeks,
    pending_inputs,
)
from pollination.geo import NaturaIndex, area_ha, centroid, to_shape
from pollination.nasa import hls, hls_pc
from pollination.nasa.cache import write_atomic
from pollination.nasa.failure import attempt, no_token
from pollination.nasa.power import PowerDaily, daily_point
from pollination.weeks import SEASON_END, WEEKS, latest_season, week_end, week_start

log = logging.getLogger(__name__)
router = APIRouter()

HLS_LOOKBACK_DAYS = 30
MAX_POLYGON_SPAN_DEG = 0.1  # about 8 to 11 km: a field, not a region
# Failed season inputs are reused this long, so with NASA down every slider move
# does not wait for the same timeouts again.
RETRY_FAILED_S = 120.0

OWN_HLS = (
    "Satellite bloom is read for the listed parcels only; "
    "an own parcel uses its declared window"
)

type PowerFetch = Callable[[float, float, date, date], PowerDaily]
type ParcelPower = Callable[[int, m.Parcel], PowerDaily | str]
type HlsLatest = Callable[[m.Polygon], m.HlsResponse]


@cache
def catalog() -> Catalog:
    """Load and validate ``data/`` on first use."""
    return load_catalog(Settings())


@cache
def natura_index() -> NaturaIndex:
    """The protected-area layer, projected once, for classifying drawn parcels."""
    return NaturaIndex.for_bbox(catalog().natura, Settings().bbox)


# Each season's inputs with when they were fetched.
_inputs_by_year: dict[int, tuple[SeasonInputs, float]] = {}
# One lock per season: a slow NASA fetch for one season does not block the other.
_inputs_locks: defaultdict[int, Lock] = defaultdict(Lock)
# Each season's timeline with the inputs it was built from.
_timelines: dict[int, tuple[SeasonInputs, m.TimelineResponse]] = {}
_timelines_lock = Lock()
# Seasons whose HLS and SMAP a background thread is fetching right now.
_fetching: set[int] = set()


def too_large(polygon: m.Polygon) -> bool:
    """Whether a drawn polygon spans more than a field (``MAX_POLYGON_SPAN_DEG``)."""
    west, south, east, north = to_shape(polygon).bounds
    return max(east - west, north - south) > MAX_POLYGON_SPAN_DEG


def check_season(year: int) -> None:
    """Refuse a season that is neither in the shipped cache nor the latest one.

    Raises:
        HTTPException: 422 for any other year.
    """
    seasons = sorted({*map(int, m.Season), latest_season(date.today())})
    if year not in seasons:
        detail = f"Season must be one of {seasons}"
        raise HTTPException(status_code=422, detail=detail)


def _fetch(
    year: int,
    *,
    satellites: bool,
    progress: Callable[[str, int, int], None] | None = None,
) -> SeasonInputs:
    """Fetch a season's inputs from NASA (or its cache), or only POWER for now."""
    settings, data = Settings(), catalog()
    if not satellites:
        return pending_inputs(year, data.parcels, settings.cache_dir, data.phenology)
    return fetch_inputs(
        year,
        data.parcels,
        settings.cache_dir,
        earthdata=settings.has_earthdata,
        live_hls=settings.has_hls,
        phenology=data.phenology,
        progress=progress,
    )


def _keep(year: int, inputs: SeasonInputs) -> None:
    """Store a season's inputs; the caller holds the season's lock."""
    _inputs_by_year[year] = (inputs, monotonic())
    _timelines.pop(year, None)  # built from the inputs just replaced


def _progress_file(year: int) -> Path:
    """Where a season's background fetch notes how far it has got."""
    return Settings().cache_dir / f"progress-{year}.json"


def _record_progress(path: Path, source: str, done: int, total: int) -> None:
    """Worker side: note a source's (done, total) reads, replacing the file at once.

    The fetch runs in another process, so the server reads this file instead of
    sharing memory with it.
    """
    try:
        steps = json.loads(path.read_text())
    except (OSError, ValueError):
        steps = {}
    steps[source] = [done, total]
    write_atomic(path, json.dumps(steps).encode())


def fetch_progress(year: int) -> list[m.FetchProgress]:
    """How far the season's background fetch has got, per source started so far."""
    try:
        steps = json.loads(_progress_file(year).read_text())
    except (OSError, ValueError):  # not started, finished, or mid-replace
        return []
    return [
        m.FetchProgress(source=source, done=done, total=total)
        for source, (done, total) in steps.items()
    ]


def _fetch_satellites(year: int) -> None:
    """Background: replace a season's pending inputs with the full ones.

    The slow read runs outside the season's lock, so requests keep being answered.
    """
    path = _progress_file(year)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    try:
        # Minutes of remote HLS/SMAP reads: in a worker process, not this one.
        inputs = worker.run(
            _fetch, year, satellites=True, progress=partial(_record_progress, path)
        )
        with _inputs_locks[year]:
            _keep(year, inputs)
    finally:
        _fetching.discard(year)
        path.unlink(missing_ok=True)


def season_inputs(year: int) -> SeasonInputs:
    """Dependency: the season's NASA inputs (tests override it to stay offline).

    Inputs are kept in memory; inputs with a failed request only for
    ``RETRY_FAILED_S``, after which a call fetches again. Concurrent first requests
    wait for one fetch instead of each starting one.

    A season outside the shipped cache needs minutes of HLS and SMAP reads, so with
    an Earthdata token it answers at once with POWER only (``pending``) and a
    background thread fetches the rest.
    """
    check_season(year)
    with _inputs_locks[year]:
        kept = _inputs_by_year.get(year)
        if kept and (not kept[0].failed or monotonic() - kept[1] < RETRY_FAILED_S):
            return kept[0]
        if year in _fetching and kept:
            return kept[0]  # failed POWER; the running fetch will replace it
        slow = year not in set(m.Season) and Settings().has_hls
        inputs = _fetch(year, satellites=not slow)
        _keep(year, inputs)
        if slow:
            _fetching.add(year)
            Thread(target=_fetch_satellites, args=(year,), daemon=True).start()
        return inputs


def prefetch_latest_season() -> None:
    """Start fetching the latest season in the background, if HLS can be read live.

    Its HLS and SMAP reads take minutes on a cold cache, so they are under way
    before the first visitor asks for the season.
    """
    if Settings().has_hls:
        year = latest_season(date.today())
        Thread(target=season_inputs, args=(year,), daemon=True).start()


def season_timeline(
    year: int, inputs: Annotated[SeasonInputs, Depends(season_inputs)]
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
        return worker.run(
            hls.latest_for_polygon, polygon, HLS_LOOKBACK_DAYS, cache_dir=cache_dir
        )

    return latest


def own_power() -> ParcelPower:
    """Dependency: POWER for a drawn parcel's season (tests override it)."""
    cache_dir = Settings().cache_dir

    def fetch(year: int, parcel: m.Parcel) -> PowerDaily | str:
        return parcel_power(year, parcel, cache_dir, catalog().phenology)

    return fetch


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
    year: int,
    timeline: Annotated[m.TimelineResponse, Depends(season_timeline)],
) -> m.TimelineResponse:
    """Return weekly bloom, nectar and evidence for every parcel in a season.

    While its satellite part is being fetched, it says how far that has got.
    """
    if not timeline.pending:
        return timeline
    return timeline.model_copy(update={"progress": fetch_progress(year)})


def _week_rows(timeline: m.TimelineResponse, week: int) -> dict[str, m.ParcelWeek]:
    """A week's timeline rows by parcel id."""
    return {w.parcel_id: w for w in timeline.parcel_weeks if w.week == week}


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
    weeks = _week_rows(timeline, week)
    return match(keeper, data.parcels, weeks, data.calculator, data.ranking)


@router.post("/matches")
def my_matches(
    profile: m.MatchRequest,
    week: m.Week,
    timeline: Annotated[m.TimelineResponse, Depends(season_timeline)],
) -> list[m.MatchCard]:
    """Return a signed-in beekeeper's candidates for a week, of both service types.

    The profile comes with the request and is not stored. Distances start from its
    home, and its own costs prefill each card's calculator input.
    """
    data = catalog()
    keeper = m.Beekeeper(
        id="you",
        name="You",
        synthetic=False,
        goal="forage",  # not used: both service types are matched
        **profile.model_dump(exclude={"costs"}),
    )
    weeks = _week_rows(timeline, week)
    return match(
        keeper,
        data.parcels,
        weeks,
        data.calculator,
        data.ranking,
        costs=profile.costs,
        services=("pollination", "forage"),
    )


@router.get("/calculator/defaults")
def calculator_defaults() -> CalculatorDefaults:
    """Return the illustrative cost defaults a beekeeper's own costs replace."""
    return catalog().calculator


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
    year: int = m.Season.COMPARISON,
) -> m.PowerResponse:
    """Return heat units, rain and bee-flight weather at a drawn polygon.

    One POWER node under the polygon's centre serves the season (March to August of
    ``year``) and the 2015-2024 rain baseline; a failed request is a ``Missing``
    value with its reason.
    """
    check_season(year)
    settings = Settings()
    lon, lat = centroid(polygon)

    def get(start: date, end: date) -> PowerDaily | str:
        return attempt("POWER", partial(fetch, lat, lon, start, end))[0]

    with ThreadPoolExecutor(2) as pool:  # two independent requests
        season = pool.submit(get, date(year, 1, 1), date(year, *SEASON_END))
        history = pool.submit(
            get, date(BASELINE_YEARS[0], 1, 1), date(BASELINE_YEARS[-1], 12, 31)
        )
    return power_response(
        year,
        season.result(),
        history.result(),
        base_temp_c=settings.gdd_base_temp_c,
        min_tmax_c=settings.bee_flight_min_tmax_c,
        max_wind_ms=settings.bee_flight_max_wind_ms,
        baseline_years=BASELINE_YEARS,
    )


@router.post("/polygon/timeline")
def own_timeline(
    own: m.OwnParcelRequest,
    year: int,
    inputs: Annotated[SeasonInputs, Depends(season_inputs)],
    fetch: Annotated[ParcelPower, Depends(own_power)],
) -> m.OwnParcelTimeline:
    """Return the weekly bloom of a parcel a beekeeper drew, anywhere on Earth.

    Heat-unit crops are modelled from NASA POWER at the parcel's own grid node;
    other crops use the declared window. Soil moisture comes from the season's SMAP
    cells where they cover the parcel. Nothing is stored.

    Raises:
        HTTPException: 422 for an unknown season, or a polygon without area,
            larger than a field, or outside the SMAP grid.
    """
    check_season(year)
    shape = to_shape(own.geometry)
    if not shape.is_valid or shape.area == 0:
        raise HTTPException(status_code=422, detail="The polygon has no area")
    if too_large(own.geometry):
        detail = "Polygon too large; draw one around a single field"
        raise HTTPException(status_code=422, detail=detail)
    parcel = m.Parcel(
        id=own.id,
        grower_id="you",
        crop=own.crop,
        area_ha=round(area_ha(own.geometry), 2),
        geometry=own.geometry,
        illustrative=False,
        service_type="forage",
        requested_colonies=None,
        declared_bloom=own.declared_bloom,
        irrigated=own.irrigated,
        natura_status=natura_index().check(own.geometry).status,
    )
    try:
        weeks = parcel_weeks(
            parcel,
            catalog().phenology.get(own.crop),
            year,
            power=fetch(year, parcel),
            observations=OWN_HLS,
            smap=inputs.smap,
        )
    except ValueError as exc:  # outside the SMAP grid (beyond about 85 degrees)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return m.OwnParcelTimeline(parcel=parcel, weeks=weeks)


@router.get("/imagery/hls")
def hls_imagery(
    year: Annotated[int, Query(ge=hls_pc.START_YEAR)],
    week: Annotated[int, Query(ge=WEEKS.start, lt=WEEKS.stop)],
) -> m.HlsImagery:
    """Return true-colour HLS map tiles of a timeline week's clearest passes."""

    def missing(note: str) -> m.HlsImagery:
        provenance = m.Provenance.missing(hls_pc.SOURCE, note)
        return m.HlsImagery(tiles=None, provenance=provenance)

    if not Settings().planetary_computer:
        return missing("HLS mirror switched off")
    start, end = week_start(year, week), week_end(year, week)
    try:
        tiles = hls_pc.week_tiles(start, end)
    except Exception as exc:  # any failure becomes Missing
        log.warning("HLS imagery request failed: %s", exc)
        return missing("The HLS mirror did not answer; try again")
    note = f"Clearest Sentinel-2 passes of {start} to {end}, true colour"
    provenance = m.Provenance(
        kind="Observed",
        source=hls_pc.SOURCE,
        observed_at=None,
        note=f"{note}; clouds are not removed",
    )
    return m.HlsImagery(tiles=tiles, provenance=provenance)


@router.post("/polygon/hls")
def hls_latest(
    polygon: m.Polygon, latest: Annotated[HlsLatest, Depends(latest_hls)]
) -> m.HlsResponse:
    """Return the latest usable HLS scene of a drawn polygon (last 30 days).

    Slow on a cold cache (remote reads); needs the HLS mirror or an Earthdata token.
    """
    if not Settings().has_hls:
        return hls.missing_response(no_token("HLS"))
    if too_large(polygon):
        return hls.missing_response(
            "Polygon too large for a satellite read; draw one around a single field"
        )
    got = attempt("HLS", partial(latest, polygon))[0]
    return hls.missing_response(got) if isinstance(got, str) else got
