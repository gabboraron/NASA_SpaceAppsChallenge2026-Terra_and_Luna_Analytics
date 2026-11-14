"""Models and loaders for the committed ``data/`` config files (plan WP4)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, NonNegativeFloat

from pollination.models import Actors, NaturaCollection

type Crop = Literal["apple", "sour_cherry", "black_locust", "sunflower", "grassland"]


class PhenologyEntry(BaseModel):
    """Per-crop bloom parameters; every numeric field stays None until sourced."""

    method: Literal["gdd", "ndyi"]
    base_temp_c: float | None
    gdd_bloom_start: NonNegativeFloat | None
    gdd_bloom_end: NonNegativeFloat | None
    uncertainty_days: NonNegativeFloat | None
    ndyi_bloom_threshold: float | None
    source: str | None
    status: str
    leads: list[str]
    note: str


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


def load_actors(data_dir: Path) -> Actors:
    """Load and validate ``actors.json``."""
    return Actors.model_validate_json((data_dir / "actors.json").read_text("utf-8"))


def load_phenology(data_dir: Path) -> dict[Crop, PhenologyEntry]:
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
