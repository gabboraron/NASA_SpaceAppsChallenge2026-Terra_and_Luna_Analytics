"""WP2 contract fixtures. Real clients and engine calculations arrive in WP13."""

from datetime import date, timedelta

from fastapi import APIRouter, HTTPException

from pollination import models as m
from pollination.engine import calculator

router = APIRouter()
SOURCE = "WP2 synthetic example"
MISSING = m.Provenance(
    kind="Missing", source=SOURCE, observed_at=None, note="No NASA query performed."
)
GAP = m.Measurement(value=None, provenance=MISSING)
SHAPE = m.Polygon(
    coordinates=[[(22.12, 47.83), (22.13, 47.83), (22.13, 47.84), (22.12, 47.83)]]
)
PARCEL = m.Parcel(
    id="P1",
    grower_id="G1",
    crop="sunflower",
    area_ha=3,
    geometry=SHAPE,
    illustrative=True,
    service_type="pollination",
    requested_colonies=50,
    declared_bloom=None,
    natura_status="clear",
)
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
    return [PARCEL]


@router.get("/natura2000")
def natura2000() -> m.NaturaCollection:
    """Return the protected-area overlay."""
    return m.NaturaCollection(features=[])


@router.get("/actors")
def actors() -> m.Actors:
    """Return synthetic participants."""
    return m.Actors(
        growers=[m.Grower(id="G1", name="Example grower", synthetic=True)],
        beekeepers=[
            m.Beekeeper(
                id="B1",
                name="Example beekeeper",
                synthetic=True,
                home=(22.11, 47.83),
                colonies=50,
                max_distance_km=40,
                goal="pollination",
                availability=m.Window(start=date(2024, 3, 1), end=date(2024, 8, 31)),
            )
        ],
    )


@router.get("/timeline")
def timeline(year: m.Season) -> m.TimelineResponse:
    """Return weekly example shapes for the requested season."""
    weeks = [
        m.ParcelWeek(
            parcel_id=PARCEL.id,
            week=week,
            starts_on=date(year, 3, 1) + timedelta(weeks=week - 1),
            bloom_state="none",
            bloom_provenance=MISSING,
            nectar_state="unknown",
            nectar_provenance=MISSING,
            estimated_bloom=None,
            ndvi=GAP,
            ndyi=GAP,
            gdd=GAP,
            smap_cell_id=None,
        )
        for week in range(1, 27)
    ]
    return m.TimelineResponse(year=year, parcel_weeks=weeks, smap_cells=[])


@router.get("/matches")
def matches(beekeeper_id: str, year: m.Season, week: m.Week) -> list[m.MatchCard]:
    """Return an illustrative card with calculator inputs."""
    if beekeeper_id != "B1":
        return []
    return [
        m.MatchCard(
            beekeeper_id=beekeeper_id,
            parcel_id=PARCEL.id,
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
    """Return a simulated verification example without recording state."""
    if id != PARCEL.id:
        raise HTTPException(status_code=404, detail="Unknown parcel")
    return m.Provenance(
        kind="Observed",
        source=SOURCE,
        observed_at=date.today(),
        note="Simulated verification; no field observation.",
    )


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
