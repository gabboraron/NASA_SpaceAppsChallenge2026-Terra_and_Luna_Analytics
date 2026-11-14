"""Tests for the HLS client logic (no network): masking, indices, caching."""

import threading
from datetime import date
from pathlib import Path

import numpy as np
import pytest
from numpy.typing import NDArray
from shapely.geometry import Polygon

from pollination.models import Parcel
from pollination.nasa.hls import (
    BandWindow,
    Obs,
    Scene,
    latest_for_polygon,
    normalized_difference,
    parcel_indices,
    scene_day,
    summarize,
    valid_mask,
)

SQUARE = [[21.7, 47.8], [21.71, 47.8], [21.71, 47.81], [21.7, 47.81], [21.7, 47.8]]


def parcel(pid: str = "P01") -> Parcel:
    """Build a minimal parcel."""
    return Parcel.model_validate(
        {
            "id": pid,
            "grower_id": "G1",
            "crop": "sunflower",
            "area_ha": 5.0,
            "geometry": {"type": "Polygon", "coordinates": [SQUARE]},
            "illustrative": True,
            "service_type": "pollination",
            "requested_colonies": 20,
            "declared_bloom": None,
            "natura_status": "clear",
        }
    )


def window(  # noqa: PLR0913  # one keyword per band keeps the tests readable
    *,
    green: float = 0.2,
    blue: float = 0.1,
    nir: float = 0.5,
    red: float = 0.1,
    fmask: int = 0,
    shape: tuple[int, int] = (2, 2),
) -> BandWindow:
    """Uniform reflectance window, every pixel inside the polygon."""

    def fill(value: float) -> NDArray[np.float32]:
        return np.full(shape, value, dtype=np.float32)

    return BandWindow(
        blue=fill(blue),
        green=fill(green),
        red=fill(red),
        nir=fill(nir),
        fmask=np.full(shape, fmask, dtype=np.uint8),
        inside=np.ones(shape, dtype=np.bool_),
    )


@pytest.mark.parametrize(
    ("fmask", "valid"),
    [
        (0, True),
        (0b00000001, True),  # cirrus alone is tolerated
        (0b00000010, False),  # cloud
        (0b00000100, False),  # adjacent to cloud or shadow
        (0b00001000, False),  # cloud shadow
        (0b00010000, False),  # snow / ice
        (0b00100000, False),  # water
        (0b11000000, True),  # aerosol level bits are ignored
    ],
)
def test_valid_mask_bits(fmask: int, valid: bool) -> None:
    """Cloud, adjacency, shadow, snow and water bits invalidate a pixel."""
    assert bool(valid_mask(np.array([fmask], dtype=np.uint8))[0]) is valid


def test_normalized_difference() -> None:
    """NDVI-style ratio; a zero denominator gives NaN, not an error."""
    a = np.array([0.5, 0.0], dtype=np.float32)
    b = np.array([0.1, 0.0], dtype=np.float32)
    result = normalized_difference(a, b)
    assert result[0] == pytest.approx(0.4 / 0.6)
    assert np.isnan(result[1])


def test_summarize_means_and_valid_fraction() -> None:
    """NDVI = (NIR-Red)/(NIR+Red), NDYI = (Green-Blue)/(Green+Blue)."""
    result = summarize(window())
    assert result is not None
    ndvi, ndyi, valid_fraction = result
    assert ndvi == pytest.approx(0.4 / 0.6)
    assert ndyi == pytest.approx(0.1 / 0.3)
    assert valid_fraction == 1.0


def test_summarize_drops_mostly_masked_scenes() -> None:
    """Fewer than 50 percent valid pixels means no observation."""
    win = window()
    win.fmask[:] = 0
    win.fmask[0, :] = 0b10  # half the pixels cloudy: exactly 50 percent is kept
    assert summarize(win) is not None
    win.fmask[1, 0] = 0b10  # now 25 percent valid
    assert summarize(win) is None


def test_summarize_ignores_pixels_outside_polygon() -> None:
    """Only pixels inside the polygon count towards the fraction and the mean."""
    win = window()
    win.inside[0, :] = False
    win.nir[0, :] = np.nan  # would poison the mean if it were included
    result = summarize(win)
    assert result is not None
    assert result[2] == 1.0


def test_summarize_empty_polygon() -> None:
    """A polygon covering no pixel gives no observation."""
    win = window()
    win.inside[:] = False
    assert summarize(win) is None


def test_scene_day_from_granule_name() -> None:
    """The acquisition day is encoded as year + day-of-year in the granule id."""
    assert scene_day("HLS.S30.T34TFT.2024186T094031.v2.0") == date(2024, 7, 4)


class Fakes:
    """Counts calls to the fake search and reader."""

    def __init__(self, windows: dict[str, BandWindow | None]) -> None:
        self.windows = windows
        self.reads = 0
        self._lock = threading.Lock()

    def search(
        self, bbox: tuple[float, float, float, float], start: date, end: date
    ) -> list[Scene]:
        """Return the scenes of ``windows``, dated from the scene id suffix."""
        del bbox, start, end
        return [
            Scene(id=sid, day=date(2024, 7, int(sid[-2:])), urls={})
            for sid in self.windows
        ]

    def read(self, scene: Scene, polygon: Polygon) -> BandWindow | None:
        """Return the prepared window for the scene."""
        del polygon
        with self._lock:
            self.reads += 1
        return self.windows[scene.id]


def test_parcel_indices_orders_and_drops_unusable_scenes(tmp_path: Path) -> None:
    """Cloudy and unreadable scenes are dropped; the rest are sorted by date."""
    cloudy = window(fmask=0b10)
    fakes = Fakes(
        {
            "S_12": window(green=0.3),
            "S_05": window(),
            "S_20": cloudy,
            "S_25": None,
        }
    )
    result = parcel_indices(
        [parcel()],
        date(2024, 7, 1),
        date(2024, 7, 31),
        search=fakes.search,
        read=fakes.read,
        cache_dir=tmp_path,
    )
    assert [o.day.day for o in result["P01"]] == [5, 12]
    assert result["P01"][1].ndyi > result["P01"][0].ndyi


def test_parcel_indices_second_run_hits_the_cache(tmp_path: Path) -> None:
    """A rerun reads no scene again, including the ones that had no observation."""
    fakes = Fakes({"S_05": window(), "S_20": window(fmask=0b10)})
    days = (date(2024, 7, 1), date(2024, 7, 31))

    def run() -> dict[str, list[Obs]]:
        return parcel_indices(
            [parcel()], *days, search=fakes.search, read=fakes.read, cache_dir=tmp_path
        )

    first = run()
    assert fakes.reads == 2
    assert run() == first
    assert fakes.reads == 2


def test_latest_for_polygon_returns_latest_observation(tmp_path: Path) -> None:
    """The newest usable scene inside the window wins and is labelled Observed."""
    fakes = Fakes({"S_05": window(), "S_12": window(green=0.3)})
    response = latest_for_polygon(
        parcel().geometry,
        days=30,
        today=date(2024, 7, 20),
        search=fakes.search,
        read=fakes.read,
        cache_dir=tmp_path,
    )
    assert response.observed_at == date(2024, 7, 12)
    assert response.ndvi.provenance.kind == "Observed"
    assert response.ndyi.value == pytest.approx(0.5)  # (0.3-0.1)/(0.3+0.1)


def test_latest_for_polygon_missing_explains_why(tmp_path: Path) -> None:
    """No usable scene gives a Missing measurement with a reason."""
    fakes = Fakes({"S_05": window(fmask=0b10)})
    response = latest_for_polygon(
        parcel().geometry,
        days=30,
        today=date(2024, 7, 20),
        search=fakes.search,
        read=fakes.read,
        cache_dir=tmp_path,
    )
    assert response.observed_at is None
    assert response.ndvi.value is None
    assert response.ndvi.provenance.kind == "Missing"
    assert response.ndvi.provenance.note
