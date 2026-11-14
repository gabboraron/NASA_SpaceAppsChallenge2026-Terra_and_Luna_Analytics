"""Parcel and region geometry: travel distance, protected-area status, SMAP cells.

Everything takes and returns lon/lat (WGS84) in the shapes of ``pollination.models``.
Metric work (the protected-area buffer) runs in a Lambert azimuthal equal-area
projection centred on the working region, so it works anywhere on Earth; on the
pilot region it classifies parcels exactly like EPSG:3035 named in the plan.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

import numpy as np
import shapely
from numpy.typing import NDArray
from pyproj import CRS, Transformer
from shapely.geometry import Polygon as ShapelyPolygon

from pollination import models as m

type NaturaStatus = Literal["inside", "buffer_overlap", "clear"]
type Bbox = tuple[float, float, float, float]

EARTH_RADIUS_KM = 6371.0088  # IUGG mean radius
DETOUR_FACTOR = 1.3  # plan D22: straight line to road distance
NATURA_BUFFER_M = 3_000.0  # plan D15: warn when a site is within 3 km

# SMAP L4 (SPL4SMGP) global EASE-Grid 2.0, 9 km, EPSG:6933. The grid spans
# x in [-SMAP_COLS / 2, SMAP_COLS / 2] * SMAP_CELL_M and likewise y with rows.
SMAP_CELL_M = 9_008.055210146
SMAP_COLS = 3856
SMAP_ROWS = 1624
_SMAP_X0 = -SMAP_COLS * SMAP_CELL_M / 2  # west edge
_SMAP_Y0 = SMAP_ROWS * SMAP_CELL_M / 2  # north edge
_TO_EASE = Transformer.from_crs(4326, 6933, always_xy=True)
_FROM_EASE = Transformer.from_crs(6933, 4326, always_xy=True)


# --- distance ---------------------------------------------------------------


def haversine_km(a: m.Position, b: m.Position) -> float:
    """Great-circle distance on the mean-radius sphere.

    Args:
        a: Start as (lon, lat) degrees.
        b: End as (lon, lat) degrees.

    Returns:
        Distance in kilometres (within ~0.5 % of the WGS84 geodesic).
    """
    lon1, lat1, lon2, lat2 = map(math.radians, (*a, *b))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def travel_distance_km(a: m.Position, b: m.Position) -> m.Measurement:
    """Estimated road distance: haversine times the detour factor (plan D22).

    Args:
        a: Start as (lon, lat), e.g. a beekeeper's home.
        b: End as (lon, lat), e.g. a parcel centroid.

    Returns:
        Kilometres with ``Estimated`` provenance; the UI lets the user edit it.
    """
    return m.Measurement(
        value=haversine_km(a, b) * DETOUR_FACTOR,
        provenance=m.Provenance(
            kind="Estimated",
            source=f"Great-circle distance x {DETOUR_FACTOR} detour factor",
            observed_at=None,
            note="No routing service; edit if the real route differs.",
        ),
    )


# --- shapes -----------------------------------------------------------------


def to_shape(polygon: m.Polygon) -> ShapelyPolygon:
    """Convert a contract polygon to a shapely polygon (lon/lat)."""
    return ShapelyPolygon(polygon.coordinates[0], polygon.coordinates[1:])


def centroid(polygon: m.Polygon) -> m.Position:
    """Centroid in lon/lat; planar in degrees, exact enough at parcel scale."""
    point = to_shape(polygon).centroid
    return (point.x, point.y)


def _projector(centre: m.Position) -> Callable[[ShapelyPolygon], ShapelyPolygon]:
    """Return a lon/lat to metres projection centred on ``centre`` (LAEA)."""
    lon, lat = centre
    crs = CRS.from_proj4(f"+proj=laea +lon_0={lon} +lat_0={lat} +datum=WGS84 +units=m")
    transformer = Transformer.from_crs(4326, crs, always_xy=True)

    def to_metres(xy: NDArray[np.float64]) -> NDArray[np.float64]:
        return np.column_stack(transformer.transform(xy[:, 0], xy[:, 1]))

    def project(geom: ShapelyPolygon) -> ShapelyPolygon:
        return shapely.transform(geom, to_metres)

    return project


# --- protected areas (plan D15) -----------------------------------------------


def _site_label(props: dict[str, str]) -> str:
    """Return ``"name (code)"`` for a protected-area feature."""
    return f"{props.get('site_name', '?')} ({props.get('site_code', '?')})"


@dataclass(frozen=True)
class NaturaCheck:
    """Protected-area status of one parcel and the sites behind it.

    Attributes:
        status: ``inside`` (hard block), ``buffer_overlap`` (warning) or ``clear``.
        sites: ``"name (code)"`` of the sites that caused the status, sorted.
    """

    status: NaturaStatus
    sites: tuple[str, ...] = ()


class NaturaIndex:
    """Protected-area layer projected once, queried per parcel or drawn polygon."""

    def __init__(self, natura: m.NaturaCollection, centre: m.Position) -> None:
        """Project every site around ``centre``.

        Args:
            natura: Protected-area polygons (properties ``site_name``, ``site_code``).
            centre: (lon, lat) of the working region; keep queries within a few
                hundred km of it so the projection stays accurate.
        """
        self._project = _projector(centre)
        self._sites = [
            (_site_label(f.properties), self._project(to_shape(f.geometry)))
            for f in natura.features
        ]

    @classmethod
    def for_bbox(cls, natura: m.NaturaCollection, bbox: Bbox) -> NaturaIndex:
        """Build an index centred on a (west, south, east, north) bbox."""
        west, south, east, north = bbox
        return cls(natura, ((west + east) / 2, (south + north) / 2))

    def check(self, polygon: m.Polygon) -> NaturaCheck:
        """Classify a parcel against the protected areas.

        Any shared area means ``inside``: where the hives stand within the parcel is
        unknown, so a partial overlap is blocked too. Otherwise a site within
        ``NATURA_BUFFER_M`` of the parcel edge gives ``buffer_overlap``.

        Args:
            polygon: Parcel or user-drawn polygon in lon/lat.

        Returns:
            The status and the sites that caused it.
        """
        parcel = self._project(to_shape(polygon))
        inside = {
            name for name, site in self._sites if parcel.intersection(site).area > 0
        }
        if inside:
            return NaturaCheck("inside", tuple(sorted(inside)))
        zone = parcel.buffer(NATURA_BUFFER_M)
        near = {name for name, site in self._sites if zone.intersects(site)}
        if near:
            return NaturaCheck("buffer_overlap", tuple(sorted(near)))
        return NaturaCheck("clear")


# --- SMAP cells -----------------------------------------------------------------


@dataclass(frozen=True)
class SmapCell:
    """One cell of the SMAP L4 global 9 km EASE-Grid 2.0 (row 0 = north)."""

    row: int
    col: int

    @property
    def id(self) -> str:
        """Stable id shared by the SMAP client, timeline and map layer."""
        return f"M09_r{self.row}_c{self.col}"

    def polygon(self) -> m.Polygon:
        """Cell outline in lon/lat (a lon/lat rectangle: the grid is cylindrical)."""
        x0 = _SMAP_X0 + self.col * SMAP_CELL_M
        y0 = _SMAP_Y0 - self.row * SMAP_CELL_M
        w, n = _FROM_EASE.transform(x0, y0)
        e, s = _FROM_EASE.transform(x0 + SMAP_CELL_M, y0 - SMAP_CELL_M)
        # Edge cells round a hair past +-180; clamp so the contract validates.
        w, e = max(w, -180.0), min(e, 180.0)
        return m.Polygon(coordinates=[[(w, s), (e, s), (e, n), (w, n), (w, s)]])


def smap_cell(point: m.Position) -> SmapCell:
    """Return the SMAP 9 km cell containing a point.

    Args:
        point: (lon, lat) degrees.

    Returns:
        The cell; index it as ``sm_rootzone[row, col]`` in an SPL4SMGP granule.

    Raises:
        ValueError: If the point lies outside the grid (|lat| > ~85.04 degrees).
    """
    x, y = _TO_EASE.transform(*point)
    col = math.floor((x - _SMAP_X0) / SMAP_CELL_M)
    row = math.floor((_SMAP_Y0 - y) / SMAP_CELL_M)
    if not (0 <= row < SMAP_ROWS and 0 <= col < SMAP_COLS):
        raise ValueError(f"{point} is outside the SMAP EASE-Grid 2.0 9 km grid")
    return SmapCell(row, col)


def smap_cells(bbox: Bbox) -> list[SmapCell]:
    """Return every SMAP cell intersecting a (west, south, east, north) bbox."""
    west, south, east, north = bbox
    nw, se = smap_cell((west, north)), smap_cell((east, south))
    return [
        SmapCell(row, col)
        for row in range(nw.row, se.row + 1)
        for col in range(nw.col, se.col + 1)
    ]
