"""Tests for the HLS client logic (no network): masking, indices, caching."""

import threading
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pytest
from numpy.typing import NDArray
from shapely.geometry import Polygon

from pollination.models import HlsResponse, Parcel
from pollination.nasa.hls import (
    DEFAULT_PER_WEEK,
    BandWindow,
    Obs,
    Scene,
    latest_for_polygon,
    normalized_difference,
    parcel_indices,
    passes,
    scene_day,
    summarize,
    valid_mask,
    weeks_of_passes,
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
            "irrigated": False,
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


def hls_id(short: str) -> str:
    """Realistic granule id for a short test name like ``S_05`` (July day 05)."""
    return f"HLS.S30.T34TET.20241{int(short[-2:]) + 82:02d}T0940{short[-2:]}.v2.0"


class Fakes:
    """Counts calls to the fake search and reader."""

    def __init__(self, windows: dict[str, BandWindow | None]) -> None:
        self.windows = windows
        self.by_id = {hls_id(sid): win for sid, win in windows.items()}
        self.reads = 0
        self._lock = threading.Lock()

    def search(
        self, bbox: tuple[float, float, float, float], start: date, end: date
    ) -> list[Scene]:
        """Return the scenes of ``windows``, dated from the scene id suffix."""
        del bbox, start, end
        return [
            Scene(id=hls_id(sid), day=date(2024, 7, int(sid[-2:])), urls={})
            for sid in self.windows
        ]

    def read(self, scene: Scene, polygon: Polygon) -> BandWindow | None:
        """Return the prepared window for the scene."""
        del polygon
        with self._lock:
            self.reads += 1
        return self.by_id[scene.id]


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


def test_parcel_indices_reports_progress_up_to_every_block(tmp_path: Path) -> None:
    """Progress climbs per 7-day block and ends at all blocks of all parcels."""
    fakes = Fakes({"S_05": window(), "S_20": window()})
    seen: list[tuple[int, int]] = []
    parcel_indices(
        [parcel(), parcel()],
        date(2024, 7, 1),
        date(2024, 7, 31),  # 5 blocks: four full weeks and a 3-day tail
        search=fakes.search,
        read=fakes.read,
        cache_dir=tmp_path,
        progress=lambda done, total: seen.append((done, total)),
    )
    assert seen == [(0, 10), (1, 10), (2, 10), (5, 10), (6, 10), (7, 10), (10, 10)]


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


def scene(
    tile: str, doy: int, cloud: float | None = None, stamp: str = "094031"
) -> Scene:
    """A scene of tile ``tile`` on day-of-year ``doy`` (2024) with CMR cloud cover."""
    sid = f"HLS.S30.{tile}.2024{doy:03d}T{stamp}.v2.0"
    return Scene(id=sid, day=scene_day(sid), urls={}, cloud=cloud)


class SceneFakes:
    """Search and read fakes over explicit scenes; windows are looked up by scene id."""

    def __init__(self, windows: dict[str, BandWindow | None]) -> None:
        self.windows = windows
        self.read_ids: list[str] = []
        self._lock = threading.Lock()

    def search(
        self, bbox: tuple[float, float, float, float], start: date, end: date
    ) -> list[Scene]:
        """Return every scene that has a prepared window."""
        del bbox, start, end
        return [scene_from_id(sid) for sid in self.windows]

    def read(self, scene: Scene, polygon: Polygon) -> BandWindow | None:
        """Record the read and return the prepared window."""
        del polygon
        with self._lock:
            self.read_ids.append(scene.id)
        return self.windows[scene.id]


CLOUDS: dict[str, float] = {}


def scene_from_id(sid: str) -> Scene:
    """Rebuild a scene from its id, with the cloud cover registered in CLOUDS."""
    return Scene(id=sid, day=scene_day(sid), urls={}, cloud=CLOUDS.get(sid))


def test_passes_group_overlapping_tiles_of_one_overpass() -> None:
    """The same sensor pass seen through two tiles is one group, tiles sorted."""
    a = scene("T34UEU", 189, stamp="094041")
    b = scene("T34TET", 189, stamp="094041")
    other_pass = scene("T34TET", 189, stamp="094141")
    other_day = scene("T34TET", 191, stamp="092549")
    groups = passes([a, other_day, b, other_pass])
    assert [[s.id for s in g] for g in groups] == [
        [b.id, a.id],
        [other_pass.id],
        [other_day.id],
    ]


def test_weeks_of_passes_split_on_seven_day_blocks_and_sort_by_cloud() -> None:
    """Passes fall in 7-day blocks counted from the search start, clearest first."""
    start = date(2024, 7, 1)  # day-of-year 183
    clear = scene("T34TET", 186, cloud=5)  # Jul 4, week 0
    hazy = scene("T34TET", 184, cloud=60)  # Jul 2, week 0
    unknown = scene("T34TET", 185)  # no cloud info counts as 100
    next_week = scene("T34TET", 191, cloud=90)  # Jul 9, week 1
    weeks = weeks_of_passes(passes([hazy, next_week, unknown, clear]), start)
    assert [[g[0].id for g in week] for week in weeks] == [
        [clear.id, hazy.id, unknown.id],
        [next_week.id],
    ]


def run_scenes(
    fakes: SceneFakes, tmp_path: Path, per_week: int | None = DEFAULT_PER_WEEK
) -> list[Obs]:
    """Observe the parcel over July 2024 with the fakes."""
    result = parcel_indices(
        [parcel()],
        date(2024, 7, 1),
        date(2024, 7, 31),
        search=fakes.search,
        read=fakes.read,
        cache_dir=tmp_path,
        per_week=per_week,
    )
    return result["P01"]


def test_reads_one_tile_per_overpass(tmp_path: Path) -> None:
    """A parcel in the tile overlap is read once, not once per tile."""
    a, b = scene("T34TET", 189), scene("T34UEU", 189)
    fakes = SceneFakes({a.id: window(), b.id: window()})
    observations = run_scenes(fakes, tmp_path)
    assert fakes.read_ids == [a.id]
    assert [o.scene_id for o in observations] == [a.id]


def test_falls_back_to_the_next_tile_when_the_first_has_no_data(tmp_path: Path) -> None:
    """A parcel outside the first tile is found in the second."""
    a, b = scene("T34TET", 189), scene("T34UEU", 189)
    fakes = SceneFakes({a.id: None, b.id: window()})
    observations = run_scenes(fakes, tmp_path)
    assert fakes.read_ids == [a.id, b.id]
    assert [o.scene_id for o in observations] == [b.id]


def test_default_cap_reads_the_two_clearest_passes_of_a_week(tmp_path: Path) -> None:
    """With four good passes in one week only the two least cloudy are read."""
    scenes = [scene("T34TET", 184 + i, cloud=c) for i, c in enumerate((40, 10, 30, 20))]
    CLOUDS.update({s.id: s.cloud for s in scenes if s.cloud is not None})
    fakes = SceneFakes({s.id: window() for s in scenes})
    observations = run_scenes(fakes, tmp_path)
    assert sorted(fakes.read_ids) == sorted([scenes[1].id, scenes[3].id])
    assert len(observations) == 2  # the default cap


def test_cap_keeps_going_past_unusable_passes(tmp_path: Path) -> None:
    """A clear scene that is cloudy over the parcel does not count towards the cap."""
    scenes = [scene("T34TET", 184 + i, cloud=c) for i, c in enumerate((10, 20, 30, 40))]
    CLOUDS.update({s.id: s.cloud for s in scenes if s.cloud is not None})
    windows: dict[str, BandWindow | None] = {s.id: window() for s in scenes}
    windows[scenes[0].id] = window(fmask=0b10)  # the clearest scene is cloudy here
    fakes = SceneFakes(windows)
    observations = run_scenes(fakes, tmp_path)
    assert fakes.read_ids == [scenes[0].id, scenes[1].id, scenes[2].id]
    assert [o.scene_id for o in observations] == [scenes[1].id, scenes[2].id]


def test_no_cap_reads_every_pass(tmp_path: Path) -> None:
    """``per_week=None`` reads all passes of the week."""
    scenes = [scene("T34TET", 184 + i, cloud=10 * i) for i in range(4)]
    CLOUDS.update({s.id: s.cloud for s in scenes if s.cloud is not None})
    fakes = SceneFakes({s.id: window() for s in scenes})
    observations = run_scenes(fakes, tmp_path, per_week=None)
    assert len(fakes.read_ids) == 4
    assert len(observations) == 4


class CountingSearch(SceneFakes):
    """SceneFakes that also counts how often the scene search runs."""

    def __init__(self, windows: dict[str, BandWindow | None]) -> None:
        super().__init__(windows)
        self.searches = 0

    def search(
        self, bbox: tuple[float, float, float, float], start: date, end: date
    ) -> list[Scene]:
        """Count the call, then search as usual."""
        self.searches += 1
        return super().search(bbox, start, end)


def test_search_of_a_finished_period_is_cached(tmp_path: Path) -> None:
    """A warm cache needs no CMR search at all for a season that is over."""
    a = scene("T34TET", 189)
    fakes = CountingSearch({a.id: window()})
    first = run_scenes(fakes, tmp_path)
    assert fakes.searches == 1
    assert run_scenes(fakes, tmp_path) == first
    assert fakes.searches == 1


def test_search_of_a_running_period_is_not_cached(tmp_path: Path) -> None:
    """Scenes keep arriving until the period ends, so it is searched live each time."""
    a = scene("T34TET", 189)
    fakes = CountingSearch({a.id: window()})
    today = date.today()  # the property under test is relative to today

    def run() -> None:
        parcel_indices(
            [parcel()],
            today - timedelta(days=30),
            today,
            search=fakes.search,
            read=fakes.read,
            cache_dir=tmp_path,
        )

    run()
    run()
    assert fakes.searches == 2


def latest(fakes: SceneFakes, tmp_path: Path) -> HlsResponse:
    """The latest observation of the test parcel, looking back 30 days from 20 July."""
    return latest_for_polygon(
        parcel().geometry,
        days=30,
        today=date(2024, 7, 20),
        search=fakes.search,
        read=fakes.read,
        cache_dir=tmp_path,
    )


def test_latest_reads_the_newest_pass_first_and_stops(tmp_path: Path) -> None:
    """When the newest pass is usable, older ones are not read at all."""
    older, newest = scene("T34TET", 190), scene("T34TET", 200)
    fakes = SceneFakes({older.id: window(), newest.id: window(green=0.3)})
    response = latest(fakes, tmp_path)
    assert fakes.read_ids == [newest.id]
    assert response.observed_at == newest.day


def test_latest_falls_back_to_an_older_pass_when_the_newest_is_cloudy(
    tmp_path: Path,
) -> None:
    """A cloudy newest pass is skipped, newest usable one wins."""
    older, newest = scene("T34TET", 190), scene("T34TET", 200)
    fakes = SceneFakes({older.id: window(), newest.id: window(fmask=0b10)})
    response = latest(fakes, tmp_path)
    assert fakes.read_ids == [newest.id, older.id]
    assert response.observed_at == older.day
