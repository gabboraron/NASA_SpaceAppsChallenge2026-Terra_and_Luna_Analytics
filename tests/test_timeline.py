"""Weekly timeline engine on synthetic NASA inputs (no network)."""

from collections.abc import Callable
from datetime import date, timedelta
from pathlib import Path

import pytest
from pytest_httpx import HTTPXMock

from pollination import models as m
from pollination.config import Settings
from pollination.datafiles import PhenologyEntry, load_phenology
from pollination.engine import timeline as tl
from pollination.geo import centroid, smap_cell
from pollination.nasa import smap as smap_client
from pollination.nasa.hls import Obs
from pollination.nasa.power import PowerDaily

PHENOLOGY = load_phenology(Settings().data_dir)
SHAPE = m.Polygon(
    coordinates=[[(22.12, 47.83), (22.13, 47.83), (22.13, 47.84), (22.12, 47.83)]]
)
DECLARED = m.Window(start=date(2024, 7, 5), end=date(2024, 7, 30))


def parcel(
    crop: str = "black_locust",
    *,
    irrigated: bool = False,
    declared: m.Window | None = DECLARED,
    pid: str = "P1",
) -> m.Parcel:
    return m.Parcel(
        id=pid,
        grower_id="G1",
        crop=crop,
        area_ha=3,
        geometry=SHAPE,
        illustrative=True,
        service_type="forage",
        requested_colonies=None,
        declared_bloom=declared,
        irrigated=irrigated,
        natura_status="clear",
    )


def date_range(first: date, last: date) -> list[date]:
    """Every day from ``first`` to ``last``, inclusive."""
    return [first + timedelta(days=i) for i in range((last - first).days + 1)]


def weather(
    first: date, last: date, temps: Callable[[date], tuple[float, float]]
) -> PowerDaily:
    """Daily (Tmax, Tmin) from ``temps`` for every day from ``first`` to ``last``."""
    days = date_range(first, last)
    pairs = [temps(d) for d in days]
    tmax: list[float | None] = [hi for hi, _ in pairs]
    tmin: list[float | None] = [lo for _, lo in pairs]
    return PowerDaily(
        lat=48.0, lon=21.875, days=days, values={"T2M_MAX": tmax, "T2M_MIN": tmin}
    )


def power(year: int, mean_c: float) -> PowerDaily:
    """Constant daily mean temperature from 1 Jan to 31 Aug."""
    return weather(date(year, 1, 1), date(year, 8, 31), lambda _: (mean_c, mean_c))


def weeks_of(
    p: m.Parcel, year: int = 2024, daily: PowerDaily | str | None = None
) -> list[m.ParcelWeek]:
    return tl.parcel_weeks(
        p,
        PHENOLOGY.get(p.crop),
        year,
        power=power(year, 15.0) if daily is None else daily,
        observations="n/a",
        smap="SMAP missing",
    )


def test_week_numbering_starts_on_1_march() -> None:
    assert tl.week_start(2024, 1) == date(2024, 3, 1)
    assert tl.week_start(2024, 26) == date(2024, 8, 23)
    assert tl.week_of(2024, date(2024, 3, 7)) == 1
    assert tl.week_of(2024, date(2024, 3, 8)) == 2
    assert tl.week_of(2024, date(2024, 2, 29)) is None
    assert tl.week_of(2024, date(2024, 8, 30)) is None  # after week 26


def test_gdd_window_drives_sour_cherry_bloom() -> None:
    # base 2, mean 15 -> 13 GDD/day from 1 Mar: 250.7 on day 20, 390 on day 30.
    weeks = weeks_of(parcel("sour_cherry"))
    blooming = [w for w in weeks if w.bloom_state == "blooming"]
    first = blooming[0]
    assert first.estimated_bloom == m.Window(
        start=date(2024, 3, 20), end=date(2024, 3, 30)
    )
    assert first.starts_on <= date(2024, 3, 20) <= first.starts_on + timedelta(6)
    assert weeks[0].bloom_state == "pre_bloom"
    assert weeks[-1].bloom_state == "post_bloom"
    assert first.bloom_provenance.kind == "Estimated"
    assert "doi:10.1007/s00484-013-0651-1" in first.bloom_provenance.note
    assert first.gdd.value == pytest.approx(
        13.0 * ((first.starts_on - date(2024, 3, 1)).days + 7)
    )
    assert "growing degree days" in (first.gdd.provenance.note or "").lower()
    assert first.smap_cell_id == smap_cell(centroid(SHAPE)).id


def test_sigmoid_forcing_drives_apple_bloom() -> None:
    # Cold to March (mean <= 3.3 °C adds nothing), then mean 15 °C:
    # 28.4 / (1 + exp(-0.185 * (15 - 3.3 - 18.4))) = 6.38 FU/day, 143 on day 23.
    daily = weather(
        date(2024, 1, 1),
        date(2024, 8, 31),
        lambda d: (20.0, 10.0) if d >= date(2024, 3, 1) else (4.0, 0.0),
    )
    weeks = weeks_of(parcel("apple"), daily=daily)
    window = weeks[0].estimated_bloom
    assert window == m.Window(start=date(2024, 3, 23), end=date(2024, 4, 6))
    assert "Forcing units (Chmielewski" in (weeks[5].gdd.provenance.note or "")


def locust_weather(first: date) -> PowerDaily:
    # Autumn Tmax 8 / Tmin 0 (below TB 8.88): chill -4 °D/day, C* -138.95 on day 35.
    # From 1 March Tmin 15 > TB: forcing 20 - 8.88 = 11.12 °D/day, F* 247.73 on day 23.
    return weather(
        first,
        date(2024, 8, 31),
        lambda d: (25.0, 15.0) if date(2024, 3, 1) <= d else (8.0, 0.0),
    )


def test_chill_days_model_drives_locust_full_bloom() -> None:
    weeks = weeks_of(parcel(), daily=locust_weather(date(2023, 10, 1)))
    window = weeks[0].estimated_bloom
    # Full bloom on 23 March; 10 bloom days (18 to 27 March) centred on it.
    assert window == m.Window(start=date(2024, 3, 18), end=date(2024, 3, 27))
    assert weeks[2].bloom_state == "blooming"
    assert "full bloom" in weeks[2].bloom_provenance.note
    # Chilling met on 4 November; week 1 (to 7 March) holds 7 forcing days.
    assert weeks[0].gdd.value == pytest.approx(7 * 11.12)
    assert "from 04 Nov 2023" in (weeks[0].gdd.provenance.note or "")


def test_chill_model_without_autumn_data_falls_back_to_declared() -> None:
    weeks = weeks_of(parcel(), daily=locust_weather(date(2024, 1, 1)))
    july = next(w for w in weeks if w.starts_on == date(2024, 7, 5))
    assert july.bloom_state == "blooming"
    assert july.bloom_provenance.kind == "Reported"
    assert "2023-10-01" in july.bloom_provenance.note
    assert july.gdd.provenance.kind == "Missing"


def test_missing_power_falls_back_to_declared_window_of_that_year() -> None:
    weeks = weeks_of(
        parcel(), year=2022, daily="NASA POWER request failed (ConnectError)"
    )
    july = next(w for w in weeks if w.starts_on == date(2022, 7, 5))
    assert july.bloom_state == "blooming"
    prov = july.bloom_provenance
    assert prov.kind == "Reported"
    assert "ConnectError" in prov.note
    assert "declared for 2024" in prov.note
    assert july.gdd.value is None
    assert july.gdd.provenance.kind == "Missing"
    assert july.estimated_bloom is None


def test_grassland_has_no_bloom_model() -> None:
    weeks = weeks_of(parcel("grassland", declared=None))
    assert {w.bloom_state for w in weeks} == {"none"}
    assert weeks[0].bloom_provenance.kind == "Missing"
    assert weeks[0].nectar_state == "unknown"


def obs(day: date, ndyi: float) -> Obs:
    return Obs(day=day, ndvi=0.5, ndyi=ndyi, valid_fraction=0.9, scene_id="S")


def test_weekly_index_observes_interpolates_and_leaves_gaps() -> None:
    series = [
        obs(date(2024, 6, 5), 0.0),  # week 14 (31 May - 6 Jun)
        obs(date(2024, 6, 19), 0.2),  # week 16, two weeks later
        obs(date(2024, 8, 14), 0.1),  # week 24, eight weeks later
    ]
    values = tl.weekly_index(series, 2024, lambda o: o.ndyi)
    w14, w15, w16, w20 = values[13], values[14], values[15], values[19]
    assert w14.provenance.kind == "Observed"
    assert w14.provenance.observed_at == date(2024, 6, 5)
    assert w15.provenance.interpolated
    assert w15.provenance.kind == "Estimated"
    assert w15.provenance.observed_at == date(2024, 6, 5)  # D4: last real obs
    # mid-week 15 is 10 Jun: 5 of 14 days from 0.0 to 0.2
    assert w15.value == pytest.approx(0.2 * 5 / 14)
    assert w16.provenance.kind == "Observed"
    assert w20.value is None  # 56-day gap is not filled
    assert w20.provenance.kind == "Missing"
    assert values[0].value is None  # before the first observation


def sunflower_entry(threshold: float | None) -> PhenologyEntry:
    return PHENOLOGY["sunflower"].model_copy(update={"ndyi_bloom_threshold": threshold})


def test_sunflower_without_threshold_uses_declared_window() -> None:
    p = parcel("sunflower")
    weeks = tl.parcel_weeks(
        p,
        sunflower_entry(None),
        2024,
        power="n/a",
        observations=[obs(date(2024, 7, 10), 0.3)],
        smap="n/a",
    )
    july = next(w for w in weeks if w.starts_on == date(2024, 7, 5))
    assert july.bloom_state == "blooming"
    assert july.bloom_provenance.kind == "Reported"
    assert "not yet calibrated" in july.bloom_provenance.note
    assert july.ndyi.value is not None  # NDYI still shown as context


def test_sunflower_ndyi_threshold_decides_bloom() -> None:
    series = [
        obs(date(2024, 6, 19), 0.02),  # week 16
        obs(date(2024, 7, 3), 0.15),  # week 18
        obs(date(2024, 7, 17), 0.10),  # week 20
        obs(date(2024, 7, 31), 0.01),  # week 22
    ]
    weeks = tl.parcel_weeks(
        parcel("sunflower", declared=None),
        sunflower_entry(0.08),
        2024,
        power="n/a",
        observations=series,
        smap="n/a",
    )
    by_week = {w.week: w for w in weeks}
    assert by_week[16].bloom_state == "pre_bloom"
    assert by_week[18].bloom_state == "blooming"
    assert by_week[19].bloom_state == "blooming"  # interpolated 0.125
    assert by_week[19].bloom_provenance.interpolated
    assert by_week[22].bloom_state == "post_bloom"
    assert by_week[18].bloom_provenance.source.startswith("NDYI")
    assert by_week[18].estimated_bloom == m.Window(
        start=tl.week_start(2024, 18), end=tl.week_start(2024, 21) - timedelta(1)
    )
    assert by_week[5].bloom_state == "none"  # no NDYI and nothing declared
    assert by_week[5].bloom_provenance.kind == "Missing"


SMAP_DAY = date(2024, 7, 17)


@pytest.mark.parametrize(
    ("crop", "irrigated", "bloom", "smap", "expected"),
    [
        ("apple", True, "blooming", "missing", "normal"),
        ("sunflower", True, "blooming", 5.0, "normal"),  # irrigated
        ("sunflower", False, "blooming", 5.0, "low_nectar"),  # driest on record
        ("sunflower", False, "blooming", 15.0, "normal"),  # second driest of ten
        ("black_locust", False, "blooming", 5.0, "unknown"),  # rule not validated
        ("sunflower", False, "pre_bloom", 5.0, "normal"),  # not flowering
        ("sunflower", False, "blooming", "missing", "unknown"),
        ("sunflower", False, "blooming", None, "unknown"),  # no percentile
        ("grassland", False, "none", 5.0, "unknown"),
    ],
)
def test_nectar_rule(
    crop: str,
    irrigated: bool,  # parametrized test argument
    bloom: m.BloomState,
    smap: float | str | None,
    expected: m.NectarState,
) -> None:
    week = (
        "SMAP missing"
        if isinstance(smap, str)
        else tl.SmapWeek(value=0.2, percentile=smap, observed_at=SMAP_DAY)
    )
    state, prov = tl.nectar(parcel(crop, irrigated=irrigated), bloom, week, "2015-2024")
    assert state == expected
    if state == "unknown":
        assert prov.kind == "Missing"
    else:
        assert prov.kind == "Estimated"
        assert "Heuristic" in prov.note


def smap_season(p: m.Parcel, percentile: float) -> tl.SmapSeason:
    cell = smap_cell(centroid(p.geometry))
    weeks = {
        w: tl.SmapWeek(0.2, percentile, tl.week_start(2022, w) + timedelta(3))
        for w in tl.WEEKS
    }
    return tl.SmapSeason(weeks={cell: weeks}, baseline="2015-2024")


def test_done_when_drought_year_flags_low_nectar_in_july() -> None:
    """Issue #17: 2022 sunflower blooming + low_nectar in July, 2024 normal."""
    p = parcel("sunflower", pid="P07")
    outcome: dict[int, set[str]] = {}
    for year, pct in ((2022, 5.0), (2024, 15.0)):
        inputs = tl.SeasonInputs(
            power={"P07": power(year, 15.0)}, hls="n/a", smap=smap_season(p, pct)
        )
        result = tl.build_timeline(m.Season(year), [p], PHENOLOGY, inputs, {})
        july = [w for w in result.parcel_weeks if w.starts_on.month == 7]
        outcome[year] = {w.nectar_state for w in july if w.bloom_state == "blooming"}
        assert len(result.smap_cells) == 26
    assert outcome[2022] == {"low_nectar"}
    assert outcome[2024] == {"normal"}


def test_verification_marks_only_blooming_weeks() -> None:
    p = parcel("sour_cherry")
    verified = m.Provenance(
        kind="Observed", source="Grower field photo", observed_at=date(2026, 11, 14)
    )
    inputs = tl.SeasonInputs(power={"P1": power(2024, 15.0)}, hls="n/a", smap="n/a")
    result = tl.build_timeline(m.Season(2024), [p], PHENOLOGY, inputs, {"P1": verified})
    for week in result.parcel_weeks:
        if week.bloom_state == "blooming":
            assert week.bloom_provenance == verified
        else:
            assert week.bloom_provenance.kind == "Estimated"


def test_every_parcel_gets_26_weeks() -> None:
    parcels = [parcel(pid="A"), parcel("apple", irrigated=True, pid="B")]
    inputs = tl.SeasonInputs(power={"A": power(2024, 12.0)}, hls={}, smap="n/a")
    result = tl.build_timeline(m.Season(2024), parcels, PHENOLOGY, inputs, {})
    assert [w.week for w in result.parcel_weeks] == list(tl.WEEKS) * 2
    b = [w for w in result.parcel_weeks if w.parcel_id == "B"]
    assert b[0].gdd.provenance.note == "No POWER request for this parcel"


def test_fetch_inputs_turns_failures_into_reasons(
    httpx_mock: HTTPXMock, tmp_path: Path
) -> None:
    httpx_mock.add_response(status_code=503)
    inputs = tl.fetch_inputs(2024, [parcel()], tmp_path, earthdata=False, phenology={})
    assert inputs.power["P1"] == "NASA POWER is unavailable right now (HTTP 503)"
    assert inputs.failed
    assert isinstance(inputs.hls, str)
    assert "token" in inputs.hls
    assert isinstance(inputs.smap, str)
    assert "token" in inputs.smap


def test_fetch_inputs_survives_a_malformed_power_answer(
    httpx_mock: HTTPXMock, tmp_path: Path
) -> None:
    """A 200 with a broken body is a Missing reason, not a crashed timeline."""
    httpx_mock.add_response(text="<html>maintenance</html>")
    inputs = tl.fetch_inputs(2024, [parcel()], tmp_path, earthdata=False, phenology={})
    assert isinstance(inputs.power["P1"], str)
    assert inputs.power["P1"].startswith("NASA POWER request failed: ")
    assert inputs.failed


def with_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub POWER and HLS so only the SMAP step of ``fetch_inputs`` is under test."""
    daily = PowerDaily(lat=47.5, lon=21.875, days=[], values={})

    def fake_power(*args: object, **kwargs: object) -> PowerDaily:
        return daily

    def fake_hls(*args: object, **kwargs: object) -> dict[str, list[Obs]]:
        return {}

    monkeypatch.setattr(tl, "daily_point", fake_power)
    monkeypatch.setattr(tl.hls, "parcel_indices", fake_hls)


def test_fetch_inputs_reads_smap_when_a_token_is_set(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """With Earthdata configured the season's SMAP values replace the stub."""
    with_token(monkeypatch)
    season = tl.SmapSeason({}, "2015-2024")
    seen: dict[str, object] = {}

    def fake_season(year: int, **kwargs: object) -> tl.SmapSeason:
        seen.update(year=year, **kwargs)
        return season

    monkeypatch.setattr(smap_client, "season", fake_season)
    inputs = tl.fetch_inputs(2022, [parcel()], tmp_path, earthdata=True, phenology={})
    assert inputs.smap is season
    assert not inputs.failed
    assert seen == {"year": 2022, "cache_dir": tmp_path}


def test_fetch_inputs_turns_a_smap_failure_into_a_reason(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """A failed SMAP read is a Missing reason and is retried next time."""
    with_token(monkeypatch)

    def broken(year: int, **kwargs: object) -> tl.SmapSeason:
        raise RuntimeError("OPeNDAP down")

    monkeypatch.setattr(smap_client, "season", broken)
    inputs = tl.fetch_inputs(2022, [parcel()], tmp_path, earthdata=True, phenology={})
    assert inputs.smap == "NASA SMAP request failed: OPeNDAP down"
    assert inputs.failed


def power_payload(first: date, last: date) -> dict[str, object]:
    """A minimal POWER daily response with constant values."""
    keys = [f"{d:%Y%m%d}" for d in date_range(first, last)]
    names = ("T2M_MAX", "T2M_MIN", "PRECTOTCORR", "WS2M")
    return {"properties": {"parameter": {n: dict.fromkeys(keys, 5.0) for n in names}}}


def test_fetch_inputs_adds_the_previous_autumn_for_chill_crops(
    httpx_mock: HTTPXMock, tmp_path: Path
) -> None:
    httpx_mock.add_response(json=power_payload(date(2024, 1, 1), date(2024, 8, 31)))
    httpx_mock.add_response(json=power_payload(date(2023, 10, 1), date(2023, 12, 31)))
    inputs = tl.fetch_inputs(
        2024, [parcel()], tmp_path, earthdata=False, phenology=PHENOLOGY
    )
    series = inputs.power["P1"]
    assert not isinstance(series, str)
    assert series.days[0] == date(2023, 10, 1)
    assert series.days[-1] == date(2024, 8, 31)
    assert len(series.values["T2M_MAX"]) == len(series.days)
    starts = [r.url.params["start"] for r in httpx_mock.get_requests()]
    assert starts == ["20240101", "20231001"]  # season request unchanged (cache key)
    assert not inputs.failed


def test_failed_autumn_request_keeps_the_season(
    httpx_mock: HTTPXMock, tmp_path: Path
) -> None:
    httpx_mock.add_response(json=power_payload(date(2024, 1, 1), date(2024, 8, 31)))
    httpx_mock.add_response(status_code=503)
    inputs = tl.fetch_inputs(
        2024, [parcel()], tmp_path, earthdata=False, phenology=PHENOLOGY
    )
    series = inputs.power["P1"]
    assert not isinstance(series, str)
    assert series.days[0] == date(2024, 1, 1)
    assert inputs.failed  # retried on the next request


def test_orchards_need_no_autumn_request(httpx_mock: HTTPXMock, tmp_path: Path) -> None:
    httpx_mock.add_response(json=power_payload(date(2024, 1, 1), date(2024, 8, 31)))
    tl.fetch_inputs(
        2024, [parcel("apple")], tmp_path, earthdata=False, phenology=PHENOLOGY
    )
    assert len(httpx_mock.get_requests()) == 1
