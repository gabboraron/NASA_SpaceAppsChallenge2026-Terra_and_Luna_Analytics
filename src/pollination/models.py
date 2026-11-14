"""Public contract shared by the pollination API and the map client."""

from __future__ import annotations

from datetime import date
from enum import IntEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field, NonNegativeFloat, NonNegativeInt, model_validator

type BloomState = Literal["none", "pre_bloom", "blooming", "post_bloom"]
type NectarState = Literal["normal", "low_nectar", "unknown"]
MIN_COLONIES, MAX_COLONIES = 20, 100  # calculator range (business brief)

type ServiceType = Literal["pollination", "forage"]
type Week = Annotated[int, Field(ge=1, le=26)]
type Position = tuple[
    Annotated[float, Field(ge=-180, le=180)], Annotated[float, Field(ge=-90, le=90)]
]


class Season(IntEnum):
    """Seasons supported by the demo timeline."""

    DROUGHT = 2022
    COMPARISON = 2024


class Provenance(BaseModel):
    """Origin, date and limitations of a value."""

    kind: Literal["Reported", "Observed", "Estimated", "Missing"]
    source: str
    observed_at: date | None
    interpolated: bool = False
    note: str = ""


class Measurement(BaseModel):
    """A numeric indicator or an explained gap."""

    value: float | None
    provenance: Provenance


class Polygon(BaseModel):
    """GeoJSON polygon in longitude/latitude order."""

    type: Literal["Polygon"] = "Polygon"
    coordinates: Annotated[
        list[Annotated[list[Position], Field(min_length=4)]], Field(min_length=1)
    ]

    @model_validator(mode="after")
    def validate_rings(self) -> Polygon:
        """Require closed exterior and interior rings."""
        if any(ring[0] != ring[-1] for ring in self.coordinates):
            raise ValueError("GeoJSON polygon rings must be closed")
        return self


class Window(BaseModel):
    """Inclusive date range."""

    start: date
    end: date


class Parcel(BaseModel):
    """Grower listing and mapped site."""

    id: str
    grower_id: str
    crop: str
    area_ha: NonNegativeFloat
    geometry: Polygon
    illustrative: bool
    service_type: ServiceType
    requested_colonies: NonNegativeInt | None
    fee_eur_per_colony: NonNegativeFloat | None = None
    declared_bloom: Window | None
    irrigated: bool
    natura_status: Literal["inside", "buffer_overlap", "clear"]


class Grower(BaseModel):
    """Owner of a listing."""

    id: str
    name: str
    synthetic: bool


class Beekeeper(BaseModel):
    """Provider availability and travel limits."""

    id: str
    name: str
    synthetic: bool
    home: Position
    colonies: NonNegativeInt
    max_distance_km: NonNegativeFloat
    goal: ServiceType
    availability: Window
    vehicle_l_per_100km: NonNegativeFloat
    alternative_contribution_eur: float


class Actors(BaseModel):
    """Demo participants."""

    growers: list[Grower]
    beekeepers: list[Beekeeper]


class NaturaFeature(BaseModel):
    """Protected-area geometry clipped to the demo region."""

    type: Literal["Feature"] = "Feature"
    geometry: Polygon
    properties: dict[str, str]


class NaturaCollection(BaseModel):
    """Protected-area overlay in GeoJSON form."""

    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[NaturaFeature]


class ParcelWeek(BaseModel):
    """Weekly parcel indicators and their evidence."""

    parcel_id: str
    week: Week
    starts_on: date
    bloom_state: BloomState
    bloom_provenance: Provenance
    nectar_state: NectarState
    nectar_provenance: Provenance
    estimated_bloom: Window | None
    ndvi: Measurement
    ndyi: Measurement
    gdd: Measurement
    smap_cell_id: str | None


class SoilMoistureWeek(BaseModel):
    """Soil moisture and percentile for a regional SMAP grid cell."""

    cell_id: str
    week: Week
    geometry: Polygon
    root_zone_moisture: Measurement
    percentile: Measurement


class TimelineResponse(BaseModel):
    """Seasonal map data loaded in one request."""

    year: Season
    parcel_weeks: list[ParcelWeek]
    smap_cells: list[SoilMoistureWeek]


class CalculatorInput(BaseModel):
    """Editable EUR scenario assumptions and provenance keyed by field name."""

    service_type: ServiceType
    colonies: Annotated[int, Field(ge=MIN_COLONIES, le=MAX_COLONIES)]
    distance_km: NonNegativeFloat
    fee_per_colony: NonNegativeFloat
    legs: NonNegativeInt
    fuel_l_per_100km: NonNegativeFloat
    fuel_price_per_l: NonNegativeFloat
    vehicle_cost_per_km: NonNegativeFloat
    driving_hours: NonNegativeFloat
    loading_hours: NonNegativeFloat
    hourly_labor_cost: NonNegativeFloat
    extra_feed_cost: NonNegativeFloat
    other_placement_cost: NonNegativeFloat
    honey_margin: float = 0
    alternative_contribution: float
    price_uncertainty: Annotated[float, Field(ge=0, le=1)] = 0.2
    extra_trips_low: NonNegativeInt = 1
    provenance: dict[str, Provenance] = Field(default_factory=dict)


class Scenario(BaseModel):
    """Contribution breakdown in euros."""

    revenue: float
    commission: float
    transport_cost: float
    other_costs: float
    contribution: float
    benefit_vs_alternative: float


class CalculatorResult(BaseModel):
    """Three scenario bands and base-case verdict."""

    low: Scenario
    base: Scenario
    high: Scenario
    verdict: Literal["move", "do_not_move"]
    message: str


class MatchCard(BaseModel):
    """Explainable placement recommendation or blocked candidate."""

    beekeeper_id: str
    parcel_id: str
    rank: int | None
    blocked: bool
    reasons: list[str]
    missing_items: list[str]
    warnings: list[str]
    confidence: Literal["low", "medium", "high"]
    distance_km: Measurement
    calculator_input: CalculatorInput | None


class GddPoint(BaseModel):
    """Accumulated growing degree days for a date."""

    day: date
    gdd: float


class PowerResponse(BaseModel):
    """Agrometeorological indicators for a drawn polygon."""

    gdd_series: list[GddPoint]
    gdd_provenance: Provenance
    precipitation_total_mm: Measurement
    precipitation_anomaly_mm: Measurement
    bee_flight_weather_days: Measurement


class HlsResponse(BaseModel):
    """Latest usable optical observation, with an explained gap if unavailable."""

    observed_at: date | None
    ndvi: Measurement
    ndyi: Measurement
