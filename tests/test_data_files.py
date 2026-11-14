"""Validate the committed ``data/`` files against the pydantic models (WP4)."""

import json
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
import pytest
import shapely
from pyproj import Transformer
from shapely.geometry import Point, shape
from shapely.ops import unary_union

from pollination.config import Settings
from pollination.datafiles import (
    load_actors,
    load_natura,
    load_phenology,
    load_ranking,
)
from pollination.models import Parcel

DATA = Path(__file__).resolve().parents[1] / "data"
BUFFER_M = 3000.0
EXPECTED_CROPS = {
    "apple": 3,
    "sour_cherry": 3,
    "sunflower": 5,
    "black_locust": 4,
    "grassland": 3,
}
EXPECTED_PARCELS = 18
AREA_TOLERANCE = 0.15  # stored area_ha is from the unsimplified OSM polygon

_TO_3035 = Transformer.from_crs(4326, 3035, always_xy=True)


def to_metric(geom: Any) -> Any:
    """Project a lon/lat shapely geometry to EPSG:3035 (metres)."""
    return shapely.transform(
        geom, lambda c: np.column_stack(_TO_3035.transform(c[:, 0], c[:, 1]))
    )


def parcel_features() -> list[dict[str, Any]]:
    """Return the raw parcel GeoJSON features."""
    return json.loads((DATA / "parcels.geojson").read_text("utf-8"))["features"]


def natura_union() -> Any:  # shapely geometry; shapely ships no type stubs
    """Return all Natura 2000 polygons as one geometry."""
    return unary_union(
        [shape(f.geometry.model_dump()) for f in load_natura(DATA).features]
    )


def status_of(feature: dict[str, Any]) -> str:
    """Compute inside / buffer_overlap / clear independently of the engine (WP10)."""
    natura = natura_union()
    geom = shape(feature["geometry"])
    if natura.contains(geom.centroid):
        return "inside"
    if to_metric(geom).buffer(BUFFER_M).intersects(to_metric(natura)):
        return "buffer_overlap"
    return "clear"


def test_natura_validates_and_is_inside_bbox() -> None:
    """Natura features validate and lie within the pilot bbox."""
    west, south, east, north = Settings().bbox
    features = load_natura(DATA).features
    assert features
    for feat in features:
        for lon, lat in feat.geometry.coordinates[0]:
            assert west <= lon <= east
            assert south <= lat <= north


def test_parcels_validate_against_parcel_model() -> None:
    """Every parcel builds a Parcel; the Natura status is computed, not stored."""
    features = parcel_features()
    assert len(features) == EXPECTED_PARCELS
    for feat in features:
        props = {k: v for k, v in feat["properties"].items() if k != "name"}
        parcel = Parcel.model_validate(
            {**props, "geometry": feat["geometry"], "natura_status": status_of(feat)}
        )
        assert parcel.illustrative is True


def test_parcel_mix_and_natura_cases() -> None:
    """Crop mix per the ticket, 2-3 inside Natura, at least one buffer overlap."""
    features = parcel_features()
    crops = Counter(f["properties"]["crop"] for f in features)
    assert dict(crops) == EXPECTED_CROPS
    statuses = Counter(status_of(f) for f in features)
    assert 2 <= statuses["inside"] <= 3  # ticket: 2-3 inside Natura
    assert statuses["buffer_overlap"] >= 1
    inside_crops = {
        f["properties"]["crop"] for f in features if status_of(f) == "inside"
    }
    assert inside_crops == {"grassland"}


def test_parcel_ids_unique_and_growers_exist() -> None:
    """Parcel ids are unique and every grower_id is in actors.json."""
    features = parcel_features()
    ids = [f["properties"]["id"] for f in features]
    assert len(set(ids)) == len(ids)
    growers = {g.id for g in load_actors(DATA).growers}
    assert {f["properties"]["grower_id"] for f in features} <= growers


def test_parcel_area_matches_geometry() -> None:
    """Stored area_ha agrees with the polygon area within simplification tolerance."""
    for feat in parcel_features():
        ha = to_metric(shape(feat["geometry"])).area / 10_000
        stored = feat["properties"]["area_ha"]
        assert stored == pytest.approx(ha, rel=AREA_TOLERANCE)


def test_actors_are_synthetic_and_cover_the_demo_cases() -> None:
    """All actors are synthetic; B1 is near the orchards, B2 far, B3 forages."""
    actors = load_actors(DATA)
    assert all(a.synthetic for a in [*actors.growers, *actors.beekeepers])
    by_id = {b.id: b for b in actors.beekeepers}
    assert {"B1", "B2", "B3"} <= by_id.keys()
    assert by_id["B1"].colonies == 50  # plan 4.3
    assert by_id["B2"].colonies == 40  # plan 4.3
    assert by_id["B3"].colonies == 20  # plan 4.3
    assert by_id["B3"].goal == "forage"
    orchards = unary_union(
        [
            shape(f["geometry"])
            for f in parcel_features()
            if f["properties"]["crop"] == "apple"
        ]
    ).centroid
    near = to_metric(Point(by_id["B1"].home)).distance(to_metric(orchards)) / 1000
    far = to_metric(Point(by_id["B2"].home)).distance(to_metric(orchards)) / 1000
    assert near < 25  # plan: about 15 km
    assert 150 < far < 220  # plan: about 180 km


def test_phenology_has_every_crop_and_no_unsourced_numbers() -> None:
    """Numbers may only be set together with a source (plan D20: do not invent)."""
    entries = load_phenology(DATA)
    assert set(entries) == {"apple", "sour_cherry", "sunflower", "black_locust"}
    for crop, entry in entries.items():
        numeric = [
            entry.base_temp_c,
            entry.gdd_bloom_start,
            entry.gdd_bloom_end,
            entry.uncertainty_days,
            entry.ndyi_bloom_threshold,
        ]
        if any(v is not None for v in numeric):
            assert entry.source, f"{crop}: values set without a source"
        if entry.gdd_bloom_start is not None:  # thresholds need their start day
            assert entry.gdd_start, f"{crop}: GDD thresholds without gdd_start"


def test_ranking_weights_sum_to_one() -> None:
    """Ranking weights form a convex combination and cover all provenance kinds."""
    ranking = load_ranking(DATA)
    total = sum(ranking.weights.model_dump().values())
    assert total == pytest.approx(1.0)
    assert set(ranking.provenance_confidence) == {
        "Observed",
        "Estimated",
        "Reported",
        "Missing",
    }
