"""API routes.

Parcels, Natura 2000, actors, the timeline and grower verification are real; the
rest are WP2 fixtures until WP12/WP13.
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
    )
    if not inputs.failed:
        _inputs_by_year[year] = inputs
    return inputs


SOURCE = "WP2 synthetic example"
MISSING = m.Provenance(
    kind="Missing", source=SOURCE, observed_at=None, note="No NASA query performed."
)
GAP = m.Measurement(value=None, provenance=MISSING)
INPUT = m.CalculatorInput(
    service_type="pollination",
    colonies=50,
    distance_km=15,
    fee_per_colony=60,
    legs=4,
    fuel_l_per_100km=12,
    fuel_price_per_l=1.65,
    vehicle_cost_per_km=0.3,
    driving_hours=2,
    loading_hours=2,
    hourly_labor_cost=15,
    extra_feed_cost=0,
    other_placement_cost=0,
    alternative_contribution=400,
)
INPUT.provenance = {
    key: m.Provenance(kind="Reported", source=SOURCE, observed_at=None)
    for key in type(INPUT).model_fields
    if key != "provenance"
}


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
def matches(beekeeper_id: str, year: m.Season, week: m.Week) -> list[m.MatchCard]:
    """Return an illustrative card with calculator inputs."""
    if beekeeper_id != "B1":
        return []
    return [
        m.MatchCard(
            beekeeper_id=beekeeper_id,
            parcel_id=catalog().parcels[0].id,
            rank=1,
            blocked=False,
            reasons=[f"Synthetic example for {year.value}, week {week}"],
            missing_items=["Field confirmation"],
            warnings=[SOURCE],
            confidence="low",
            distance_km=m.Measurement(
                value=INPUT.distance_km, provenance=INPUT.provenance["distance_km"]
            ),
            calculator_input=INPUT,
        )
    ]


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
