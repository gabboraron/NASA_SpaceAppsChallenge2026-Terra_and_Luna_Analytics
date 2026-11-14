"""Models and loaders for the committed ``data/`` config files (plan WP4)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    Field,
    NonNegativeFloat,
    NonNegativeInt,
    NonPositiveFloat,
    PositiveFloat,
    PositiveInt,
    model_validator,
)

from pollination.config import Settings
from pollination.geo import NaturaIndex
from pollination.models import Actors, NaturaCollection, Parcel, Polygon

MonthDay = Annotated[str, Field(pattern=r"^\d{2}-\d{2}$")]


class PhenologyEntry(BaseModel):
    """Per-crop bloom model and parameters; every number needs a cited source.

    ``method`` picks the heat series (``engine/phenology.py``): ``gdd`` (linear
    degree days from ``gdd_start``), ``sigmoid`` (Chmielewski forcing units from
    ``gdd_start``), ``chill_days`` (Cesaraccio forcing after chilling, which starts
    on ``chill_start`` of the previous year) or ``ndyi`` (HLS, sunflower).
    ``heat_threshold`` is the heat sum at ``threshold_stage``. The window ends at
    ``heat_bloom_end`` if set, else after ``bloom_days`` (centred on the threshold
    day when it marks full bloom).
    """

    method: Literal["gdd", "sigmoid", "chill_days", "ndyi"]
    base_temp_c: float | None
    # First day of heat accumulation (MM-DD); the thresholds are only valid with it.
    gdd_start: MonthDay | None
    chill_start: MonthDay | None = None
    chill_requirement: NonPositiveFloat | None = None
    heat_threshold: NonNegativeFloat | None
    threshold_stage: Literal["bloom_start", "full_bloom"] = "bloom_start"
    heat_bloom_end: NonNegativeFloat | None = None
    bloom_days: PositiveInt | None = None
    uncertainty_days: NonNegativeFloat | None
    ndyi_bloom_threshold: float | None
    source: str | None
    status: str
    leads: list[str]
    note: str

    @model_validator(mode="after")
    def _window_has_an_end(self) -> PhenologyEntry:
        if self.heat_threshold is not None and (
            (self.heat_bloom_end is None) == (self.bloom_days is None)
        ):
            raise ValueError("set exactly one of heat_bloom_end and bloom_days")
        return self

    def gdd_start_in(self, year: int) -> date | None:
        """The day heat accumulation starts in ``year``, if set."""
        return _on(self.gdd_start, year)

    def chill_start_in(self, year: int) -> date | None:
        """The day chilling starts for the ``year`` season (in the previous year)."""
        return _on(self.chill_start, year - 1)


def _on(month_day: str | None, year: int) -> date | None:
    if month_day is None:
        return None
    month, day = (int(x) for x in month_day.split("-"))
    return date(year, month, day)


class RankingWeights(BaseModel):
    """Weights of the explainable ranking terms; they must sum to 1."""

    overlap_days: NonNegativeFloat
    inverse_distance: NonNegativeFloat
    provenance_confidence: NonNegativeFloat


class Ranking(BaseModel):
    """Matching weights and the confidence value of each provenance kind."""

    weights: RankingWeights
    provenance_confidence: dict[
        Literal["Observed", "Estimated", "Reported", "Missing"], float
    ]


def _read_config(path: Path) -> dict[str, Any]:
    """Read a JSON config file without its documentation keys (leading ``_``)."""
    raw: dict[str, Any] = json.loads(path.read_text("utf-8"))
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def load_natura(data_dir: Path) -> NaturaCollection:
    """Load and validate ``natura2000.geojson``."""
    return NaturaCollection.model_validate_json(
        (data_dir / "natura2000.geojson").read_text("utf-8")
    )


def load_parcels(data_dir: Path, natura: NaturaIndex) -> list[Parcel]:
    """Load ``parcels.geojson``; the Natura status is computed here, not stored.

    Args:
        data_dir: Directory holding the committed data files.
        natura: Protected-area index used to classify every parcel.

    Returns:
        Validated parcels in file order.
    """
    raw = json.loads((data_dir / "parcels.geojson").read_text("utf-8"))
    parcels: list[Parcel] = []
    for feature in raw["features"]:
        geometry = Polygon.model_validate(feature["geometry"])
        parcels.append(
            Parcel.model_validate(
                {
                    **feature["properties"],
                    "geometry": geometry,
                    "natura_status": natura.check(geometry).status,
                }
            )
        )
    return parcels


def load_actors(data_dir: Path) -> Actors:
    """Load and validate ``actors.json``."""
    return Actors.model_validate_json((data_dir / "actors.json").read_text("utf-8"))


def load_phenology(data_dir: Path) -> dict[str, PhenologyEntry]:
    """Load ``phenology.json`` (the leading ``_note`` key is documentation)."""
    raw = _read_config(data_dir / "phenology.json")
    return {crop: PhenologyEntry.model_validate(entry) for crop, entry in raw.items()}


def load_ranking(data_dir: Path) -> Ranking:
    """Load ``ranking.json``."""
    return Ranking.model_validate(_read_config(data_dir / "ranking.json"))


class CalculatorDefaults(BaseModel):
    """Assumptions that prefill the move calculator where no actor states a value."""

    source: str
    legs: NonNegativeInt
    fuel_price_per_l: NonNegativeFloat
    vehicle_cost_per_km: NonNegativeFloat
    hourly_labor_cost: NonNegativeFloat
    average_speed_kmh: PositiveFloat
    loading_hours: NonNegativeFloat
    extra_feed_cost: NonNegativeFloat
    other_placement_cost: NonNegativeFloat
    price_uncertainty: Annotated[float, Field(ge=0, le=1)]
    extra_trips_low: NonNegativeInt


def load_calculator(data_dir: Path) -> CalculatorDefaults:
    """Load ``calculator.json`` (the leading ``_note`` key is documentation)."""
    return CalculatorDefaults.model_validate(_read_config(data_dir / "calculator.json"))


@dataclass(frozen=True)
class Catalog:
    """All committed data files the API serves, validated."""

    natura: NaturaCollection
    parcels: list[Parcel]
    phenology: dict[str, PhenologyEntry]
    actors: Actors
    calculator: CalculatorDefaults
    ranking: Ranking


def load_catalog(settings: Settings) -> Catalog:
    """Load Natura 2000, parcels (with Natura status), phenology, actors and configs."""
    natura = load_natura(settings.data_dir)
    index = NaturaIndex.for_bbox(natura, settings.bbox)
    return Catalog(
        natura=natura,
        parcels=load_parcels(settings.data_dir, index),
        phenology=load_phenology(settings.data_dir),
        actors=load_actors(settings.data_dir),
        calculator=load_calculator(settings.data_dir),
        ranking=load_ranking(settings.data_dir),
    )
