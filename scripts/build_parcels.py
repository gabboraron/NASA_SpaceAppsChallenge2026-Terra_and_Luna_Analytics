# pyright: basic
# (basic mode: shapely ships without type stubs)
"""One-off dev script: build ``data/parcels.geojson`` from OpenStreetMap land use.

Real OSM polygons supply the *geometry* (orchards, arable fields, woodland, meadows
near Ujfeherto). The *crop labels* are assigned here for the demo and are NOT
observed: OSM carries no species or crop tags for these polygons. Every parcel is
therefore ``illustrative: true`` (plan D7). Selection is deterministic.
Re-run with ``uv run python scripts/build_parcels.py``. Raw OSM answers are cached
under ``.cache/osm`` (gitignored).
"""

import hashlib
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, NamedTuple, cast

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import Point, Polygon, shape
from shapely.ops import unary_union

from pollination.config import Settings

OVERPASS = "https://overpass-api.de/api/interpreter"
CENTRE = Point(21.68, 47.80)  # Ujfeherto: parcels nearest here are chosen first
BUFFER_M = 3000.0
FEE_EUR = 60.0  # brief worked example (EUR per colony), illustrative
DECIMALS = 5
MIN_HA, MAX_HA = 2.0, 40.0
MIN_SEPARATION_DEG = 0.005  # about 500 m between chosen parcels
MIN_RING_POINTS = 4
RETRIES = 5
MIN_COLONIES, MAX_COLONIES = 20, 60


class Spec(NamedTuple):
    """Crop label, service, declared bloom (2024 demo season) and irrigation."""

    crop: str
    service: str
    bloom: tuple[str, str] | None
    irrigated: bool


APPLE = Spec("apple", "pollination", ("2024-04-22", "2024-05-08"), True)
CHERRY = Spec("sour_cherry", "pollination", ("2024-04-08", "2024-04-24"), True)
SUNFLOWER = Spec("sunflower", "pollination", ("2024-07-05", "2024-07-30"), False)
LOCUST = Spec("black_locust", "forage", ("2024-05-12", "2024-05-28"), False)
GRASSLAND = Spec("grassland", "forage", None, False)
ORCHARDS_PER_GROWER = 3

log = logging.getLogger(__name__)
_TO_3035 = Transformer.from_crs(4326, 3035, always_xy=True)


def to_metric(geom: Any) -> Any:
    """Project a lon/lat shapely geometry to EPSG:3035 (metres)."""
    return shapely.transform(
        geom, lambda c: np.column_stack(_TO_3035.transform(c[:, 0], c[:, 1]))
    )


def overpass(settings: Settings, selector: str) -> list[dict[str, Any]]:
    """Return OSM ways matching ``selector`` in the bbox, cached and retried."""
    w, s, e, n = settings.bbox
    query = f"[out:json][timeout:90];way{selector}({s},{w},{n},{e});out geom;"
    cache = (
        settings.cache_dir
        / "osm"
        / f"{hashlib.sha256(query.encode()).hexdigest()}.json"
    )
    if cache.exists():
        return json.loads(cache.read_text("utf-8"))
    for attempt in range(RETRIES):
        req = urllib.request.Request(  # fixed https Overpass URL
            OVERPASS,
            data=urllib.parse.urlencode({"data": query}).encode(),
            headers={"User-Agent": "pollination-demo-data-script/0.1", "Accept": "*/*"},
        )
        try:
            with urllib.request.urlopen(req, timeout=150) as resp:  # noqa: S310
                elements = json.loads(resp.read().decode("utf-8"))["elements"]
        except urllib.error.HTTPError as exc:
            log.warning("Overpass %s for %s, retry %d", exc.code, selector, attempt + 1)
            time.sleep(10 * (attempt + 1))
            continue
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(elements), "utf-8")
        time.sleep(3)  # be polite to the public instance
        return elements
    raise RuntimeError(f"Overpass failed for {selector}")


def polygons(settings: Settings, *selectors: str) -> list[Polygon]:
    """Return valid closed OSM ways as shapely polygons."""
    out: list[Polygon] = []
    for selector in selectors:
        for el in overpass(settings, selector):
            pts = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
            if len(pts) >= MIN_RING_POINTS and pts[0] == pts[-1]:
                poly = Polygon(pts)
                if poly.is_valid:
                    out.append(poly)
    return out


def area_ha(poly: Polygon) -> float:
    """Return the polygon area in hectares (EPSG:3035)."""
    return float(to_metric(poly).area) / 10_000


def pick(
    cands: list[Polygon], n: int, natura: Any, *, inside: bool, taken: list[Polygon]
) -> list[Polygon]:
    """Pick the ``n`` candidates nearest Ujfeherto, inside or outside Natura."""
    out: list[Polygon] = []
    for p in sorted(cands, key=lambda c: c.centroid.distance(CENTRE)):
        if not MIN_HA <= area_ha(p) <= MAX_HA:
            continue
        if natura.contains(p.centroid) != inside or (
            not inside and natura.intersects(p)
        ):
            continue
        if any(p.distance(t) < MIN_SEPARATION_DEG for t in [*taken, *out]):
            continue
        out.append(p)
        if len(out) == n:
            break
    return out


def colonies(ha: float) -> int:
    """Requested colonies: about 2 per hectare, steps of 5, within calculator range."""
    return min(MAX_COLONIES, max(MIN_COLONIES, round(ha * 2 / 5) * 5))


def feature(
    pid: str, name: str, poly: Polygon, grower: str, spec: Spec
) -> dict[str, Any]:
    """Build one parcel Feature (properties per plan 4.2 and the Parcel model)."""
    crop, service, bloom, irrigated = spec
    ha = round(area_ha(poly), 1)
    ring = [
        [round(x, DECIMALS), round(y, DECIMALS)]
        for x, y in cast(Polygon, poly.simplify(0.00005)).exterior.coords
    ]
    pollination = service == "pollination"
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [ring]},
        "properties": {
            "id": pid,
            "name": name,
            "crop": crop,
            "area_ha": ha,
            "grower_id": grower,
            "service_type": service,
            "requested_colonies": colonies(ha) if pollination else None,
            "fee_eur_per_colony": FEE_EUR if pollination else None,
            "declared_bloom": {"start": bloom[0], "end": bloom[1]} if bloom else None,
            "irrigated": irrigated,
            "illustrative": True,
        },
    }


def main() -> None:
    """Select parcels and write ``data/parcels.geojson``."""
    settings = Settings()
    natura_fc = json.loads(
        (settings.data_dir / "natura2000.geojson").read_text("utf-8")
    )
    natura = unary_union([shape(f["geometry"]) for f in natura_fc["features"]])
    natura_m = to_metric(natura)

    orchards = polygons(settings, '["landuse"="orchard"]')
    farmland = polygons(settings, '["landuse"="farmland"]')
    woods = polygons(settings, '["natural"="wood"]', '["landuse"="forest"]')
    meadows = polygons(settings, '["landuse"="meadow"]', '["natural"="grassland"]')
    log.info(
        "OSM candidates: %d orchard, %d farmland, %d wood, %d meadow",
        len(orchards),
        len(farmland),
        len(woods),
        len(meadows),
    )

    taken: list[Polygon] = []
    orch = pick(orchards, 6, natura, inside=False, taken=taken)
    taken += orch
    sun = pick(farmland, 5, natura, inside=False, taken=taken)
    taken += sun
    loc = pick(woods, 4, natura, inside=False, taken=taken)
    taken += loc
    grass = pick(meadows, 3, natura, inside=True, taken=taken)

    plan = (
        [
            (
                p,
                "G1" if i < ORCHARDS_PER_GROWER else "G2",
                APPLE if i % 2 == 0 else CHERRY,
            )
            for i, p in enumerate(orch)
        ]
        + [(p, "G3", SUNFLOWER) for p in sun]
        + [(p, "G4", LOCUST) for p in loc]
        + [(p, "G4", GRASSLAND) for p in grass]
    )
    features = [
        feature(
            f"P{i:02d}",
            f"Illustrative {spec.crop.replace('_', ' ')} parcel {i}",
            p,
            g,
            spec,
        )
        for i, (p, g, spec) in enumerate(plan, start=1)
    ]
    out = settings.data_dir / "parcels.geojson"
    out.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}), "utf-8"
    )

    status = {"inside": 0, "buffer_overlap": 0, "clear": 0}
    for p, _, _ in plan:
        if natura.contains(p.centroid):
            status["inside"] += 1
        elif to_metric(p).buffer(BUFFER_M).intersects(natura_m):
            status["buffer_overlap"] += 1
        else:
            status["clear"] += 1
    log.info("wrote %d parcels to %s; natura status: %s", len(features), out, status)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
