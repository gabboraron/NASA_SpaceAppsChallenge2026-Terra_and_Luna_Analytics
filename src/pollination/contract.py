"""API routes.

Parcels, Natura 2000, actors, the timeline, grower verification, the calculator and
the matches are real; the polygon routes are WP2 fixtures until WP13.
"""

from datetime import date
from functools import cache
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from pollination import models as m
from pollination import state
from pollination.config import Settings
from pollination.datafiles import Catalog, load_catalog
from pollination.engine import calculator
from pollination.engine.matching import match
from pollination.engine.timeline import SeasonInputs, build_timeline, fetch_inputs

router = APIRouter()


@cache
def catalog() -> Catalog:
    """Load and validate ``data/`` on first use."""
    return load_catalog(Settings())


_inputs_by_year: dict[m.Season, SeasonInputs] = {}


def season_inputs(year: m.Season) -> SeasonInputs:
    """Dependency: the season's NASA inputs (tests override it to stay offline).

    Inputs are kept in memory unless a request failed, so a later call retries.
    """
    if year in _inputs_by_year:
        return _inputs_by_year[year]
    settings = Settings()
    inputs = fetch_inputs(
        year,
        catalog().parcels,
        settings.cache_dir,
        earthdata=settings.earthdata_token is not None,
        phenology=catalog().phenology,
    )
    if not inputs.failed:
        _inputs_by_year[year] = inputs
    return inputs


SOURCE = "WP2 synthetic example"
MISSING = m.Provenance(
    kind="Missing", source=SOURCE, observed_at=None, note="No NASA query performed."
)
GAP = m.Measurement(value=None, provenance=MISSING)


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
    year: m.Season, inputs: Annotated[SeasonInputs, Depends(season_inputs)]
) -> m.TimelineResponse:
    """Return weekly bloom, nectar and evidence for every parcel in a season."""
    data = catalog()
    return build_timeline(
        year, data.parcels, data.phenology, inputs, state.verifications
    )


@router.get("/matches")
def matches(
    beekeeper_id: str,
    year: m.Season,
    week: m.Week,
    inputs: Annotated[SeasonInputs, Depends(season_inputs)],
) -> list[m.MatchCard]:
    """Return the beekeeper's candidates for a week: ranked, blocked ones last."""
    data = catalog()
    keeper = next((b for b in data.actors.beekeepers if b.id == beekeeper_id), None)
    if keeper is None:
        return []
    timeline = build_timeline(
        year, data.parcels, data.phenology, inputs, state.verifications
    )
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
    state.verifications[id] = m.Provenance(
        kind="Observed",
        source=state.PHOTO_SOURCE,
        observed_at=date.today(),
        note="Simulated in the demo; resets when the server restarts.",
    )
    return state.verifications[id]


@router.post("/polygon/power")
def power(polygon: m.Polygon) -> m.PowerResponse:
    """Return missing indicators until the POWER integration is available."""
    return m.PowerResponse(
        gdd_series=[],
        gdd_provenance=MISSING,
        precipitation_total_mm=GAP,
        precipitation_anomaly_mm=GAP,
        bee_flight_weather_days=GAP,
    )


@router.post("/polygon/hls")
def hls(polygon: m.Polygon) -> m.HlsResponse:
    """Return the optical response shape without fetching imagery."""
    return m.HlsResponse(observed_at=None, ndvi=GAP, ndyi=GAP)
