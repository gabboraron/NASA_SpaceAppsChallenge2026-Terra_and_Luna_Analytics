"""One-off dev script: build ``data/natura2000.geojson`` from EEA Natura 2000.

Queries the Habitats (layer 0) and Birds (layer 1) Directive layers for the pilot
bbox, clips to it, simplifies, splits MultiPolygons into Polygons and writes
EPSG:4326 GeoJSON. Re-run with ``uv run python scripts/build_natura.py``.
Not used at runtime.
"""

import json
import logging
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from shapely.geometry import box, mapping, shape
from shapely.geometry.base import BaseGeometry

from pollination.config import Settings

SERVICE = (
    "https://bio.discomap.eea.europa.eu/arcgis/rest/services"
    "/ProtectedSites/Natura2000Sites/MapServer"
)
LAYERS = {0: "Habitats Directive (SCI/SAC)", 1: "Birds Directive (SPA)"}
SIMPLIFY_DEG = 0.0003  # about 30 m: plenty for a 3 km buffer test and a map overlay
DECIMALS = 5

log = logging.getLogger(__name__)


def fetch_layer(
    layer: int, bbox: tuple[float, float, float, float]
) -> list[dict[str, Any]]:
    """Return GeoJSON features of one EEA layer intersecting ``bbox``.

    Args:
        layer: MapServer layer id.
        bbox: West, south, east, north in degrees.

    Returns:
        GeoJSON feature dicts.
    """
    params = {
        "geometry": ",".join(map(str, bbox)),
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "where": "1=1",
        "outFields": "SITECODE,SITENAME,MS,SITETYPE",
        "outSR": "4326",
        "f": "geojson",
    }
    url = f"{SERVICE}/{layer}/query?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=90) as resp:  # noqa: S310  # fixed https EEA URL
        payload = json.loads(resp.read().decode("utf-8"))
    if "error" in payload:
        raise RuntimeError(f"EEA layer {layer}: {payload['error']}")
    return payload["features"]


def polygons(geom: BaseGeometry) -> list[BaseGeometry]:
    """Split a (multi)polygon into its non-empty polygon parts."""
    parts = getattr(geom, "geoms", [geom])
    return [p for p in parts if p.geom_type == "Polygon" and not p.is_empty]


def main() -> None:
    """Fetch, clip, simplify and write the Natura 2000 overlay."""
    settings = Settings()
    clip = box(*settings.bbox)
    features: list[dict[str, Any]] = []
    for layer, directive in LAYERS.items():
        for feat in fetch_layer(layer, settings.bbox):
            geom = shape(feat["geometry"]).buffer(0).intersection(clip)
            geom = geom.simplify(SIMPLIFY_DEG, preserve_topology=True)
            props = feat["properties"]
            for i, part in enumerate(polygons(geom)):
                rounded = json.loads(json.dumps(mapping(part)))
                rounded["coordinates"] = [
                    [[round(x, DECIMALS), round(y, DECIMALS)] for x, y in ring]
                    for ring in rounded["coordinates"]
                ]
                features.append(
                    {
                        "type": "Feature",
                        "geometry": rounded,
                        "properties": {
                            "site_code": str(props["SITECODE"]),
                            "site_name": str(props["SITENAME"]).replace("­", ""),
                            "country": str(props["MS"]),
                            "directive": directive,
                            "part": str(i),
                        },
                    }
                )
    out = settings.data_dir / "natura2000.geojson"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features}, ensure_ascii=False
        ),
        encoding="utf-8",
    )
    log.info(
        "wrote %d features to %s (%d bytes)",
        len(features),
        out,
        Path(out).stat().st_size,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
