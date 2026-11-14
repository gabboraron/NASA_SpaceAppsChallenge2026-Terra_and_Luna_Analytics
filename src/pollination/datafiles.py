"""Models and loaders for the committed ``data/`` config files (plan WP4)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, Field, NonNegativeFloat

from pollination.config import Settings
from pollination.geo import NaturaIndex
from pollination.models import Actors, NaturaCollection, Parcel, Polygon


class PhenologyEntry(BaseModel):
    """Per-crop bloom parameters; every numeric field stays None until sourced."""

    method: Literal["gdd", "ndyi"]
    base_temp_c: float | None
    # First day of GDD accumulation (MM-DD); the thresholds are only valid with it.
    gdd_start: Annotated[str, Field(pattern=r"^\d{2}-\d{2}$")] | None
    gdd_bloom_start: NonNegativeFloat | None
    gdd_bloom_end: NonNegativeFloat | None
    uncertainty_days: NonNegativeFloat | None
    ndyi_bloom_threshold: float | None
    source: str | None
    status: str
    leads: list[str]
    note: str

    def gdd_start_in(self, year: int) -> date | None:
        """The day GDD accumulation starts in ``year``, if set."""
        if self.gdd_start is None:
            return None
        month, day = (int(x) for x in self.gdd_start.split("-"))
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
    raw = json.loads((data_dir / "phenology.json").read_text("utf-8"))
    return {
        crop: PhenologyEntry.model_validate(entry)
        for crop, entry in raw.items()
        if not crop.startswith("_")
    }


def load_ranking(data_dir: Path) -> Ranking:
    """Load ``ranking.json``."""
    raw = json.loads((data_dir / "ranking.json").read_text("utf-8"))
    return Ranking.model_validate(
        {k: v for k, v in raw.items() if not k.startswith("_")}
    )


@dataclass(frozen=True)
class Catalog:
    """All committed data files the API serves, validated."""

    natura: NaturaCollection
    parcels: list[Parcel]
    phenology: dict[str, PhenologyEntry]


def load_catalog(settings: Settings) -> Catalog:
    """Load Natura 2000, the parcels (with their Natura status) and phenology."""
    natura = load_natura(settings.data_dir)
    index = NaturaIndex.for_bbox(natura, settings.bbox)
    return Catalog(
        natura=natura,
        parcels=load_parcels(settings.data_dir, index),
        phenology=load_phenology(settings.data_dir),
    )
