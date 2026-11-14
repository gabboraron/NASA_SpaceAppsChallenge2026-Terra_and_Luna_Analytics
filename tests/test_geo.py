"""Tests for the geo helpers (WP10): distance, Natura status, centroid, SMAP cells."""

import math
from pathlib import Path

import pytest
from pyproj import Geod, Transformer
from shapely.geometry import box

from pollination import geo
from pollination.config import Settings
from pollination.datafiles import load_natura, load_parcels
from pollination.models import NaturaCollection, NaturaFeature, Polygon, Position

DATA = Path(__file__).resolve().parents[1] / "data"
WGS84 = Geod(ellps="WGS84")
KM_PER_DEG_LAT = 111.32


def square(lon: float, lat: float, half_km: float) -> Polygon:
    """Return a lon/lat square of ``2 * half_km`` side centred on a point."""
    dlat = half_km / KM_PER_DEG_LAT
    dlon = half_km / (KM_PER_DEG_LAT * math.cos(math.radians(lat)))
    w, s, e, n = lon - dlon, lat - dlat, lon + dlon, lat + dlat
    return Polygon(coordinates=[[(w, s), (e, s), (e, n), (w, n), (w, s)]])


def east_of(lon: float, lat: float, km: float) -> float:
    """Return the longitude ``km`` east of a point on the same parallel."""
    return lon + km / (KM_PER_DEG_LAT * math.cos(math.radians(lat)))


# --- distance ---------------------------------------------------------------


def test_haversine_one_degree_of_latitude() -> None:
    """One degree along a meridian is pi * R / 180 on the mean sphere."""
    assert geo.haversine_km((0.0, 0.0), (0.0, 1.0)) == pytest.approx(111.195, abs=1e-3)


def test_haversine_is_symmetric_and_zero_on_identity() -> None:
    """Distance does not depend on direction and vanishes for one point."""
    a, b = (21.7, 47.75), (22.3, 48.0)
    assert geo.haversine_km(a, b) == geo.haversine_km(b, a)
    assert geo.haversine_km(a, a) == 0.0


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ((21.6, 47.7), (22.4, 48.05)),  # pilot bbox diagonal
        ((-58.4, -34.6), (-57.9, -34.9)),
        ((151.0, -33.9), (150.6, -33.5)),
        ((-100.0, 45.0), (-99.0, 45.5)),
    ],
)
def test_haversine_matches_wgs84_geodesic(a: Position, b: Position) -> None:
    """The spherical distance stays within 0.5 % of the WGS84 geodesic."""
    _, _, metres = WGS84.inv(a[0], a[1], b[0], b[1])
    assert geo.haversine_km(a, b) == pytest.approx(metres / 1000, rel=0.005)


def test_travel_distance_applies_detour_and_is_estimated() -> None:
    """Travel distance is haversine * 1.3 and labelled Estimated (plan D22)."""
    a, b = (21.7, 47.75), (22.3, 48.0)
    result = geo.travel_distance_km(a, b)
    assert result.value == pytest.approx(geo.haversine_km(a, b) * geo.DETOUR_FACTOR)
    assert geo.DETOUR_FACTOR == 1.3
    assert result.provenance.kind == "Estimated"
    assert result.provenance.observed_at is None
    assert "1.3" in result.provenance.source


# --- centroid -----------------------------------------------------------------


def test_centroid_of_square() -> None:
    """The centroid of a symmetric square is its centre."""
    lon, lat = geo.centroid(square(22.0, 47.9, 1.0))
    assert (lon, lat) == pytest.approx((22.0, 47.9))


# --- Natura 2000 status: synthetic geometry, several continents -------------

CENTRES: list[Position] = [(22.0, 47.9), (-60.0, -10.0), (150.0, 60.0)]


def one_site(lon: float, lat: float) -> NaturaCollection:
    """Return a protected-area layer with one 2 x 2 km site."""
    return NaturaCollection(
        features=[
            NaturaFeature(
                geometry=square(lon, lat, 1.0),
                properties={"site_code": "XX0001", "site_name": "Test site"},
            )
        ]
    )


@pytest.mark.parametrize("centre", CENTRES)
def test_parcel_inside_site_is_inside(centre: Position) -> None:
    """A parcel within the site is blocked and names the site."""
    index = geo.NaturaIndex(one_site(*centre), centre)
    check = index.check(square(*centre, 0.2))
    assert check.status == "inside"
    assert check.sites == ("Test site (XX0001)",)


@pytest.mark.parametrize("centre", CENTRES)
def test_partial_overlap_counts_as_inside(centre: Position) -> None:
    """Any area shared with a site is a block: hive placement is unknown."""
    index = geo.NaturaIndex(one_site(*centre), centre)
    lon = east_of(*centre, 1.0)  # straddles the site's east edge
    assert index.check(square(lon, centre[1], 0.2)).status == "inside"


@pytest.mark.parametrize("centre", CENTRES)
@pytest.mark.parametrize(
    ("gap_km", "expected"), [(2.9, "buffer_overlap"), (3.1, "clear")]
)
def test_buffer_is_three_km_from_parcel_edge(
    centre: Position, gap_km: float, expected: str
) -> None:
    """Edge-to-edge gaps under 3 km warn; larger gaps are clear (plan D15)."""
    index = geo.NaturaIndex(one_site(*centre), centre)
    # Site east edge is at +1 km; the parcel's west edge at +1 km + gap.
    lon = east_of(*centre, 1.0 + gap_km + 0.2)
    check = index.check(square(lon, centre[1], 0.2))
    assert check.status == expected
    assert check.sites == (() if expected == "clear" else ("Test site (XX0001)",))


def test_empty_layer_is_clear() -> None:
    """Without protected areas every parcel is clear."""
    index = geo.NaturaIndex(NaturaCollection(features=[]), (22.0, 47.9))
    assert index.check(square(22.0, 47.9, 0.2)).status == "clear"


# --- Natura 2000 status: the committed pilot data ---------------------------


def test_real_parcels_natura_status() -> None:
    """Known inside parcels block, distant ones are clear, the rest warn."""
    settings = Settings()
    parcels = load_parcels(
        DATA, geo.NaturaIndex.for_bbox(load_natura(DATA), settings.bbox)
    )
    status = {p.id: p.natura_status for p in parcels}
    assert len(status) == 18
    assert {k for k, v in status.items() if v == "inside"} == {"P16", "P17", "P18"}
    assert {k for k, v in status.items() if v == "clear"} == {"P09", "P10", "P11"}
    assert status["P07"] == "buffer_overlap"  # 414 m from the nearest site
    assert sum(v == "buffer_overlap" for v in status.values()) == 12


# --- SMAP EASE-Grid 2.0 9 km cells -------------------------------------------


def test_smap_grid_matches_epsg_6933() -> None:
    """Grid half-width equals the projected x of longitude 180 degrees."""
    x_max, _ = Transformer.from_crs(4326, 6933, always_xy=True).transform(180.0, 0.0)
    assert pytest.approx(x_max, abs=1e-3) == geo.SMAP_COLS * geo.SMAP_CELL_M / 2


def test_smap_cell_matches_wp1_probe() -> None:
    """The probe point resolves to the cell the WP1 probe read from SPL4SMGP."""
    x, y = Transformer.from_crs(4326, 6933, always_xy=True).transform(22.13, 47.84)
    col = math.floor((x + 17_367_530.445161) / 9_008.055210)
    row = math.floor((7_314_540.830638 - y) / 9_008.055210)
    cell = geo.smap_cell((22.13, 47.84))
    assert (cell.row, cell.col) == (row, col)
    assert cell.id == f"M09_r{row}_c{col}"


@pytest.mark.parametrize(
    "point", [(22.13, 47.84), (-58.4, -34.6), (0.0, 0.0), (179.99, 84.9)]
)
def test_smap_cell_polygon_contains_point(point: Position) -> None:
    """A point lies inside the polygon of the cell it resolves to."""
    ring = geo.smap_cell(point).polygon().coordinates[0]
    lons = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    assert min(lons) <= point[0] <= max(lons)
    assert min(lats) <= point[1] <= max(lats)


def test_smap_cell_rejects_points_off_grid() -> None:
    """Latitudes beyond the grid's 85.04 degree limit have no cell."""
    with pytest.raises(ValueError, match="outside"):
        geo.smap_cell((0.0, 86.0))


def test_smap_cells_tile_the_bbox() -> None:
    """Cells for the pilot bbox cover it fully and do not overlap."""
    bbox = Settings().bbox
    cells = geo.smap_cells(bbox)
    tiles = [geo.to_shape(c.polygon()) for c in cells]
    region = box(*bbox)
    assert len({c.id for c in cells}) == len(cells)
    assert sum(t.intersection(region).area for t in tiles) == pytest.approx(
        region.area, rel=1e-9
    )
    assert all(t.intersects(region) for t in tiles)
    # Equal-area cells are ~7.0 km E-W x ~11.7 km N-S at 48 N: 9 cols x 4 rows.
    assert len(cells) == 36
