"""Weekly bloom and nectar timeline per parcel (plan WP11; decisions D4, D6, D12, D13).

``build_timeline`` is pure: it takes the NASA inputs already fetched (or the reason
each one is missing) and never calls the network. ``fetch_inputs`` gathers them.

Every week takes the best evidence available, in this order: the crop's model
(heat units from POWER, or HLS NDYI for sunflower), then the grower-declared
window (Reported), then Missing with the reason.
"""

from __future__ import annotations

import logging
from bisect import bisect_left
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

import httpx

from pollination import models as m
from pollination.datafiles import PhenologyEntry
from pollination.engine.phenology import (
    HeatSeries,
    accumulate,
    chill_days,
    sigmoid_forcing,
    threshold_window,
    total_on,
)
from pollination.geo import centroid, smap_cell
from pollination.nasa import hls
from pollination.nasa import smap as smap_client
from pollination.nasa.failure import reason
from pollination.nasa.power import PowerDaily, daily_point, grid_node
from pollination.nasa.smap import SmapSeason, SmapWeek
from pollination.weeks import (
    SEASON_END,
    SEASON_START,
    WEEKS,
    week_end,
    week_mid,
    week_of,
    week_start,
    window_in_year,
)

log = logging.getLogger(__name__)

# D13, tightened: blooming and root-zone moisture below this percentile -> low nectar.
# With a ten-year baseline the mid-rank percentile moves in steps of 10 (5, 15, ...),
# so "below 10" means the driest same week on record; "below 20" flickered week to
# week and flagged 2024, a good flow year on the reference hive scales.
LOW_NECTAR_PERCENTILE = 10.0
# Gap-filled NDYI/NDVI only between observations at most this far apart (D4).
MAX_INTERPOLATION_GAP_DAYS = 21
# Sunflower only: for black locust, a deep-rooted tree, the flag marked the best
# flow year of the reference hive scales (2024) as low.
NECTAR_CROPS = frozenset({"sunflower"})
ORCHARD_CROPS = frozenset({"apple", "sour_cherry"})

POWER_SOURCE = "NASA POWER daily (MERRA-2), T2M_MAX/T2M_MIN"
HEAT_SOURCE = "Heat-unit model: NASA POWER temperature + data/phenology.json"
# What the weekly heat sum counts, by phenology method.
HEAT_UNITS = {
    "gdd": "growing degree days (°C·d)",
    "sigmoid": "forcing units (Chmielewski et al. 2011)",
    "chill_days": "forcing °D after winter chilling (Cesaraccio et al. 2004)",
}
NDYI_SOURCE = f"NDYI from {hls.SOURCE}"
DECLARED_SOURCE = "Grower declaration"
PHENOLOGY_SOURCE = "data/phenology.json"
NECTAR_SOURCE = "Nectar heuristic (plan D13)"
SMAP_SOURCE = "NASA SMAP L4 (SPL4SMGP) root-zone soil moisture"


# --- inputs ----------------------------------------------------------------------


@dataclass(frozen=True)
class SeasonInputs:
    """NASA inputs for one season; a ``str`` instead of data is the missing reason.

    Attributes:
        power: Daily POWER series per parcel id (or why it is missing).
        hls: HLS observations per parcel id, for the parcels it was fetched for.
        smap: SMAP values for the region.
        failed: A request failed (worth retrying), as opposed to a source that is
            not configured or not built; failed inputs are reused only for a short
            retry pause.
    """

    power: Mapping[str, PowerDaily | str]
    hls: Mapping[str, Sequence[hls.Obs]] | str
    smap: SmapSeason | str
    failed: bool = False


# --- per-week pieces -------------------------------------------------------------

_missing = m.Provenance.missing


def _state_in(window: m.Window, year: int, week: int) -> m.BloomState:
    """Bloom state of a timeline week relative to a bloom window."""
    if week_end(year, week) < window.start:
        return "pre_bloom"
    if week_start(year, week) > window.end:
        return "post_bloom"
    return "blooming"


def weekly_index(
    observations: Sequence[hls.Obs], year: int, pick: Callable[[hls.Obs], float]
) -> list[m.Measurement]:
    """One value per timeline week from irregular HLS observations (D4).

    A week with observations takes the one nearest to mid-week (Observed). A week
    without one, lying between observations at most
    ``MAX_INTERPOLATION_GAP_DAYS`` apart, is linearly interpolated (Estimated,
    ``interpolated=True``, ``observed_at`` = the latest observation before it).
    Other weeks are Missing.

    Args:
        observations: Usable observations of one parcel, any order.
        year: Season.
        pick: Index to read from an observation (NDVI or NDYI).

    Returns:
        26 measurements, week 1 first.
    """
    by_week: dict[int, hls.Obs] = {}
    for obs in observations:
        week = week_of(year, obs.day)
        if week is None:
            continue
        mid = week_mid(year, week)
        best = by_week.get(week)
        if best is None or abs((obs.day - mid).days) < abs((best.day - mid).days):
            by_week[week] = obs
    anchors = sorted(by_week.values(), key=lambda o: o.day)
    anchor_days = [o.day for o in anchors]
    out: list[m.Measurement] = []
    for week in WEEKS:
        if week in by_week:
            obs = by_week[week]
            prov = m.Provenance(
                kind="Observed",
                source=hls.SOURCE,
                observed_at=obs.day,
                note=f"{obs.valid_fraction:.0%} of parcel pixels valid",
            )
            out.append(m.Measurement(value=pick(obs), provenance=prov))
            continue
        mid = week_mid(year, week)
        i = bisect_left(anchor_days, mid)  # no anchor falls on mid: its week is empty
        if 0 < i < len(anchors):
            a, b = anchors[i - 1], anchors[i]
            gap = (b.day - a.day).days
            if gap <= MAX_INTERPOLATION_GAP_DAYS:
                share = (mid - a.day).days / gap
                value = pick(a) + (pick(b) - pick(a)) * share
                prov = m.Provenance(
                    kind="Estimated",
                    source=hls.SOURCE,
                    observed_at=a.day,
                    interpolated=True,
                    note=f"Linear between observations of {a.day} and {b.day}",
                )
                out.append(m.Measurement(value=value, provenance=prov))
                continue
        note = (
            "No usable observation this week and none within "
            f"{MAX_INTERPOLATION_GAP_DAYS} days on both sides (cloud, shadow or no "
            "overpass)"
        )
        out.append(m.Measurement.missing(hls.SOURCE, note))
    return out


def _chill_heat(
    power: PowerDaily, entry: PhenologyEntry, base: float, year: int
) -> HeatSeries | m.Provenance:
    """Forcing after winter chilling (``chill_days`` method)."""
    chill_start = entry.chill_start_in(year)
    if chill_start is None or entry.chill_requirement is None:
        return _missing(PHENOLOGY_SOURCE, "No sourced chilling parameters")
    if power.days[0] > chill_start:
        note = f"No POWER temperatures from {chill_start} for winter chilling"
        return _missing(POWER_SOURCE, note)
    series = chill_days(
        power.days,
        power.values["T2M_MAX"],
        power.values["T2M_MIN"],
        base=base,
        chill_start=chill_start,
        chill_requirement=entry.chill_requirement,
    )
    if series is None:
        return _missing(HEAT_SOURCE, "Chilling requirement not reached in the data")
    return series


def _heat(
    power: PowerDaily | str, entry: PhenologyEntry | None, year: int
) -> HeatSeries | m.Provenance:
    """The crop model's cumulative heat sum, or the Missing reason."""
    if entry is None or entry.base_temp_c is None or entry.method == "ndyi":
        return _missing(PHENOLOGY_SOURCE, "No heat-unit model for this crop")
    if isinstance(power, str):
        return _missing(POWER_SOURCE, power)
    if entry.method == "chill_days":
        return _chill_heat(power, entry, entry.base_temp_c, year)
    start = entry.gdd_start_in(year)
    if start is None:
        return _missing(PHENOLOGY_SOURCE, "No heat accumulation start for this crop")
    model = sigmoid_forcing if entry.method == "sigmoid" else accumulate
    return model(
        power.days,
        power.values["T2M_MAX"],
        power.values["T2M_MIN"],
        entry.base_temp_c,
        start,
    )


def _last_day(heat: HeatSeries, year: int, week: int) -> date:
    """Last day of the week that has POWER data (D4: latest usable date)."""
    return min(week_end(year, week), heat.days[-1])


def _heat_measurements(
    heat: HeatSeries | m.Provenance, units: str, year: int
) -> list[m.Measurement]:
    if isinstance(heat, m.Provenance):
        return [m.Measurement(value=None, provenance=heat) for _ in WEEKS]
    note = f"{units[0].upper()}{units[1:]}, cumulative from {heat.days[0]:%d %b %Y}"
    if heat.missing_days:
        note += f"; {heat.missing_days} days without temperature counted as 0"
    out: list[m.Measurement] = []
    for week in WEEKS:
        last = _last_day(heat, year, week)
        prov = m.Provenance(
            kind="Estimated", source=POWER_SOURCE, observed_at=last, note=note
        )
        # 0 before forcing starts (chilling can end after the week).
        value = total_on(heat, last) or 0.0
        out.append(m.Measurement(value=value, provenance=prov))
    return out


@dataclass(frozen=True)
class _Bloom:
    state: m.BloomState
    provenance: m.Provenance


def _declared(parcel: m.Parcel, year: int, why: str) -> list[_Bloom]:
    """Bloom from the grower-declared window, moved to ``year`` by calendar date."""
    declared = parcel.declared_bloom
    if declared is None:
        none = _Bloom("none", _missing(DECLARED_SOURCE, f"{why}; no declared window"))
        return [none for _ in WEEKS]
    window = window_in_year(declared, year)
    note = f"{why}; using the grower-declared window"
    if declared.start.year != year:
        note += f" (declared for {declared.start.year}, same calendar dates)"
    prov = m.Provenance(
        kind="Reported", source=DECLARED_SOURCE, observed_at=None, note=note
    )
    return [_Bloom(_state_in(window, year, w), prov) for w in WEEKS]


def _heat_bloom(
    heat: HeatSeries | m.Provenance, entry: PhenologyEntry, parcel: m.Parcel, year: int
) -> tuple[list[_Bloom], m.Window | None]:
    """Bloom from the heat-unit window, or the declared fallback."""
    if isinstance(heat, m.Provenance):
        why = f"Heat-unit window unavailable: {heat.note}"
        return _declared(parcel, year, why), None
    if entry.heat_threshold is None:
        return _declared(parcel, year, "No sourced heat threshold for this crop"), None
    window = threshold_window(
        heat,
        entry.heat_threshold,
        end_threshold=entry.heat_bloom_end,
        bloom_days=entry.bloom_days,
        centred=entry.threshold_stage == "full_bloom",
    )
    if window is None:
        why = "Bloom thresholds not reached in the POWER data"
        return _declared(parcel, year, why), None
    spread = f" ±{entry.uncertainty_days:g} days" if entry.uncertainty_days else ""
    stage = entry.threshold_stage.replace("_", " ")
    end = (
        f"ends at {entry.heat_bloom_end:g}"
        if entry.heat_bloom_end is not None
        else f"lasts {entry.bloom_days} days"
    )
    note = (
        f"Window {window.start:%d %b}-{window.end:%d %b}{spread}: "
        f"{HEAT_UNITS[entry.method]} reach "
        f"{entry.heat_threshold:g} at {stage} (base {entry.base_temp_c:g} °C), "
        f"bloom {end}. Heuristic estimate from a heat-sum model, not an "
        f"observation. Source: {entry.source or 'unsourced'}"
    )
    blooms = [
        _Bloom(
            _state_in(window, year, week),
            m.Provenance(
                kind="Estimated",
                source=HEAT_SOURCE,
                observed_at=_last_day(heat, year, week),
                note=note,
            ),
        )
        for week in WEEKS
    ]
    return blooms, window


def _ndyi_bloom(
    ndyi: list[m.Measurement], entry: PhenologyEntry, parcel: m.Parcel, year: int
) -> tuple[list[_Bloom], m.Window | None]:
    """Bloom from weekly NDYI against the crop threshold; declared where no value."""
    threshold = entry.ndyi_bloom_threshold
    if threshold is None:
        why = "NDYI bloom threshold not yet calibrated"
        return _declared(parcel, year, why), None
    fallback = _declared(parcel, year, "No NDYI value this week")
    valued = [
        (w, x.value) for w, x in zip(WEEKS, ndyi, strict=True) if x.value is not None
    ]
    if not valued:
        return fallback, None
    peak_week = max(valued, key=lambda wv: wv[1])[0]
    blooming = [w for w, v in valued if v >= threshold]
    blooms: list[_Bloom] = []
    for week, measure, declared in zip(WEEKS, ndyi, fallback, strict=True):
        if measure.value is None:
            blooms.append(declared)
            continue
        if measure.value >= threshold:
            state: m.BloomState = "blooming"
        else:
            state = "pre_bloom" if week < peak_week else "post_bloom"
        prov = m.Provenance(
            kind="Estimated",
            source=NDYI_SOURCE,
            observed_at=measure.provenance.observed_at,
            interpolated=measure.provenance.interpolated,
            note=f"NDYI {measure.value:.3f} against bloom threshold {threshold:g}",
        )
        blooms.append(_Bloom(state, prov))
    window = None
    if blooming:
        window = m.Window(
            start=week_start(year, blooming[0]),
            end=week_end(year, blooming[-1]),
        )
    return blooms, window


def nectar(
    parcel: m.Parcel, bloom: m.BloomState, smap: SmapWeek | str, baseline: str
) -> tuple[m.NectarState, m.Provenance]:
    """Apply the D13 nectar heuristic to one parcel week.

    Orchards and irrigated parcels are assumed not water-limited (normal). For
    sunflower, a blooming week in a SMAP cell drier than every same week of the
    baseline (below the 10th percentile) is ``low_nectar``: dry soil during bloom,
    a risk to nectar, not a measurement of it.

    Args:
        parcel: The parcel.
        bloom: Its bloom state that week.
        smap: The parcel cell's SMAP value that week, or why it is missing.
        baseline: Baseline years of the percentile, for the note.

    Returns:
        The nectar state and its provenance.
    """
    orchard = parcel.crop in ORCHARD_CROPS
    if orchard or parcel.irrigated:
        reason = "orchard" if orchard else "irrigated parcel"
        prov = m.Provenance(
            kind="Estimated",
            source=NECTAR_SOURCE,
            observed_at=None,
            note=f"Heuristic: {reason}, assumed not water-limited",
        )
        return "normal", prov
    if parcel.crop not in NECTAR_CROPS:
        note = "The dry-soil nectar rule covers sunflower only"
        return "unknown", _missing(NECTAR_SOURCE, note)
    if isinstance(smap, str):
        return "unknown", _missing(SMAP_SOURCE, smap)
    if smap.percentile is None:
        return "unknown", _missing(SMAP_SOURCE, "No SMAP value for this cell and week")
    low = bloom == "blooming" and smap.percentile < LOW_NECTAR_PERCENTILE
    prov = m.Provenance(
        kind="Estimated",
        source=f"{SMAP_SOURCE} + {NECTAR_SOURCE}",
        observed_at=smap.observed_at,
        note=(
            f"Heuristic: root-zone moisture at percentile {smap.percentile:.0f} of "
            f"the same week in {baseline}; dry soil during bloom (nectar at risk) "
            f"if blooming and below {LOW_NECTAR_PERCENTILE:g}"
        ),
    )
    return ("low_nectar" if low else "normal"), prov


# --- assembly --------------------------------------------------------------------


def parcel_weeks(  # noqa: PLR0913  # the parcel's inputs, each from its own source
    parcel: m.Parcel,
    entry: PhenologyEntry | None,
    year: int,
    *,
    power: PowerDaily | str,
    observations: Sequence[hls.Obs] | str,
    smap: SmapSeason | str,
) -> list[m.ParcelWeek]:
    """The 26 weeks of one parcel.

    Args:
        parcel: The parcel.
        entry: Its crop's phenology parameters, None for crops without a model.
        year: Season.
        power: Daily POWER series at the parcel, or why it is missing.
        observations: HLS observations of the parcel, or why there are none.
        smap: SMAP values of the region, or why they are missing.

    Returns:
        One ``ParcelWeek`` per timeline week.
    """
    if isinstance(observations, str):
        gap = m.Measurement.missing(hls.SOURCE, observations)
        ndvi = ndyi = [gap for _ in WEEKS]
    else:
        ndvi = weekly_index(observations, year, lambda o: o.ndvi)
        ndyi = weekly_index(observations, year, lambda o: o.ndyi)
    heat = _heat(power, entry, year)
    units = HEAT_UNITS.get(entry.method, "") if entry else ""
    if entry is None:
        blooms = _declared(parcel, year, f"No bloom model for {parcel.crop}")
        window = None
    elif entry.method == "ndyi":
        blooms, window = _ndyi_bloom(ndyi, entry, parcel, year)
    else:
        blooms, window = _heat_bloom(heat, entry, parcel, year)
    cell = smap_cell(centroid(parcel.geometry))
    if isinstance(smap, str):
        cell_weeks: Mapping[int, SmapWeek] = {}
        baseline, no_smap = "", smap
    else:
        cell_weeks = smap.weeks.get(cell, {})
        baseline, no_smap = smap.baseline, "No SMAP value for this cell and week"
    weeks: list[m.ParcelWeek] = []
    rows = zip(
        WEEKS, blooms, ndvi, ndyi, _heat_measurements(heat, units, year), strict=True
    )
    for week, bloom, vi, yi, heat_sum in rows:
        state, nectar_prov = nectar(
            parcel, bloom.state, cell_weeks.get(week, no_smap), baseline
        )
        weeks.append(
            m.ParcelWeek(
                parcel_id=parcel.id,
                week=week,
                starts_on=week_start(year, week),
                bloom_state=bloom.state,
                bloom_provenance=bloom.provenance,
                nectar_state=state,
                nectar_provenance=nectar_prov,
                estimated_bloom=window,
                ndvi=vi,
                ndyi=yi,
                gdd=heat_sum,
                smap_cell_id=cell.id,
            )
        )
    return weeks


def smap_cells(smap: SmapSeason | str) -> list[m.SoilMoistureWeek]:
    """The SMAP layer of the timeline (empty when SMAP is missing)."""
    if isinstance(smap, str):
        return []
    out: list[m.SoilMoistureWeek] = []
    for cell, weeks in smap.weeks.items():
        geometry = cell.polygon()
        for week, value in sorted(weeks.items()):
            prov = m.Provenance(
                kind="Estimated", source=SMAP_SOURCE, observed_at=value.observed_at
            )
            pct = prov.model_copy(update={"note": f"Same week in {smap.baseline}"})
            if value.value is None:
                prov = pct = _missing(SMAP_SOURCE, "No SMAP value for this week")
            out.append(
                m.SoilMoistureWeek(
                    cell_id=cell.id,
                    week=week,
                    geometry=geometry,
                    root_zone_moisture=m.Measurement(
                        value=value.value, provenance=prov
                    ),
                    percentile=m.Measurement(value=value.percentile, provenance=pct),
                )
            )
    return out


def apply_verifications(
    weeks: list[m.ParcelWeek], verifications: Mapping[str, m.Provenance]
) -> list[m.ParcelWeek]:
    """Mark blooming weeks of grower-verified parcels with the verification.

    A verification (``POST /parcels/{id}/verify``, plan §4.4) confirms the bloom,
    so the bloom provenance of the parcel's blooming weeks becomes the stored one
    (Observed). Bloom states are not changed.
    """
    return [
        w.model_copy(update={"bloom_provenance": verifications[w.parcel_id]})
        if w.parcel_id in verifications and w.bloom_state == "blooming"
        else w
        for w in weeks
    ]


def build_timeline(
    year: m.Season,
    parcels: Sequence[m.Parcel],
    phenology: Mapping[str, PhenologyEntry],
    inputs: SeasonInputs,
    verifications: Mapping[str, m.Provenance],
) -> m.TimelineResponse:
    """Assemble the season timeline from already-fetched inputs.

    Args:
        year: Season.
        parcels: All listed parcels.
        phenology: Phenology parameters by crop.
        inputs: NASA inputs, or the reason each is missing.
        verifications: Grower verifications by parcel id.

    Returns:
        Weekly parcel indicators and the SMAP layer.
    """
    no_hls = "HLS indices are fetched for sunflower parcels only"
    weeks: list[m.ParcelWeek] = []
    for parcel in parcels:
        observations: Sequence[hls.Obs] | str = (
            inputs.hls
            if isinstance(inputs.hls, str)
            else inputs.hls.get(parcel.id, no_hls)
        )
        power = inputs.power.get(parcel.id, "No POWER request for this parcel")
        weeks += parcel_weeks(
            parcel,
            phenology.get(parcel.crop),
            year,
            power=power,
            observations=observations,
            smap=inputs.smap,
        )
    return m.TimelineResponse(
        year=year,
        parcel_weeks=apply_verifications(weeks, verifications),
        smap_cells=smap_cells(inputs.smap),
    )


# --- fetching --------------------------------------------------------------------


def _with_history(
    season: PowerDaily,
    node: tuple[float, float],
    start: date,
    client: httpx.Client,
    cache_dir: Path,
) -> PowerDaily:
    """Prepend the days from ``start`` to the season series (a separate request).

    The season request stays unchanged, so its cache entry is reused.

    Raises:
        httpx.HTTPError: The extra request failed.
    """
    before = daily_point(
        *node,
        start,
        season.days[0] - timedelta(days=1),
        client=client,
        cache_dir=cache_dir,
    )
    values = {k: before.values[k] + v for k, v in season.values.items()}
    return season.model_copy(
        update={"days": before.days + season.days, "values": values}
    )


def _history_start(
    parcels: Sequence[m.Parcel], phenology: Mapping[str, PhenologyEntry], year: int
) -> date | None:
    """The earliest chilling start any of these parcels' crops needs, if any."""
    starts = [
        day
        for p in parcels
        if (entry := phenology.get(p.crop)) is not None
        and entry.method == "chill_days"
        and (day := entry.chill_start_in(year)) is not None
    ]
    return min(starts, default=None)


def fetch_inputs(
    year: int,
    parcels: Sequence[m.Parcel],
    cache_dir: Path,
    *,
    earthdata: bool,
    phenology: Mapping[str, PhenologyEntry],
) -> SeasonInputs:
    """Fetch POWER, HLS and SMAP inputs for a season; failures become reasons.

    POWER is requested once per MERRA-2 grid node under the parcel centroids, from
    1 January; nodes with a crop that needs winter chilling also get the previous
    autumn in a second request. HLS is read for sunflower parcels only, and SMAP for
    the whole region; both need an Earthdata token. A cold HLS or SMAP cache takes
    minutes; warm it first (WP14).

    Args:
        year: Season.
        parcels: All listed parcels.
        cache_dir: NASA response cache root.
        earthdata: Whether an Earthdata token is configured (HLS and SMAP reads
            need it).
        phenology: Phenology entries by crop, to know which nodes need the
            previous autumn.

    Returns:
        The inputs for :func:`build_timeline`.
    """
    end = date(year, *SEASON_END)
    failed = False
    at_node: dict[tuple[float, float], list[m.Parcel]] = {}
    for parcel in parcels:
        lon, lat = centroid(parcel.geometry)
        node = grid_node(lat, lon)
        at_node.setdefault(node, []).append(parcel)
    power: dict[str, PowerDaily | str] = {}
    with httpx.Client() as client:  # one connection for every grid node
        for node, here in at_node.items():
            series: PowerDaily | str
            try:
                series = daily_point(
                    *node, date(year, 1, 1), end, client=client, cache_dir=cache_dir
                )
            except Exception as exc:  # any NASA failure becomes Missing
                log.warning("POWER request for %s failed: %s", node, exc)
                series = reason("POWER", exc)
                failed = True
            history = _history_start(here, phenology, year)
            if history is not None and not isinstance(series, str):
                try:
                    series = _with_history(series, node, history, client, cache_dir)
                except Exception as exc:  # season data stays; chilling is Missing
                    log.warning("POWER autumn request for %s failed: %s", node, exc)
                    failed = True
            for parcel in here:
                power[parcel.id] = series
    observed: Mapping[str, Sequence[hls.Obs]] | str
    if not earthdata:
        observed = "No Earthdata token configured; HLS not queried"
    else:
        targets = [
            p
            for p in parcels
            if (entry := phenology.get(p.crop)) and entry.method == "ndyi"
        ]
        try:
            observed = hls.parcel_indices(
                targets, date(year, *SEASON_START), end, cache_dir=cache_dir
            )
        except Exception as exc:  # any NASA failure becomes Missing
            log.warning("HLS fetch failed: %s", exc)
            observed = reason("HLS", exc)
            failed = True
    smap: SmapSeason | str
    if not earthdata:
        smap = "No Earthdata token configured; SMAP not queried"
    else:
        try:
            smap = smap_client.season(year, cache_dir=cache_dir)
        except Exception as exc:  # any NASA failure becomes Missing
            log.warning("SMAP fetch failed: %s", exc)
            smap = reason("SMAP", exc)
            failed = True
    return SeasonInputs(power=power, hls=observed, smap=smap, failed=failed)
