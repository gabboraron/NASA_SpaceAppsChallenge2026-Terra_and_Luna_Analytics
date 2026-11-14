"""Model side: the running API's timeline and the NASA POWER weather it is built on."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence
from datetime import date
from pathlib import Path

import httpx
from pydantic import TypeAdapter

from pollination.models import Parcel, ParcelWeek, TimelineResponse
from pollination.nasa.power import daily_point
from verification.framework import ModelWeek, Weather
from verification.references import TIMEOUT_S

LAST_MONTH = 8  # the timeline ends in August
WEATHER_PARAMS = ("T2M_MAX", "T2M_MIN", "WS2M")
_PARCELS = TypeAdapter(list[Parcel])


def summarise(
    parcels: Sequence[Parcel], weeks: Sequence[ParcelWeek]
) -> dict[str, list[ModelWeek]]:
    """Summarise a timeline per crop and week.

    Args:
        parcels: Parcels with their crop.
        weeks: Timeline entries (one per parcel and week).

    Returns:
        Crop -> weekly shares (blooming, low nectar, Missing evidence), by date.
    """
    crop_of = {p.id: p.crop for p in parcels}
    grouped: dict[tuple[str, date], list[ParcelWeek]] = defaultdict(list)
    for w in weeks:
        if w.parcel_id in crop_of:
            grouped[(crop_of[w.parcel_id], w.starts_on)].append(w)
    result: dict[str, list[ModelWeek]] = defaultdict(list)
    for (crop, starts_on), items in sorted(grouped.items()):
        n = len(items)
        result[crop].append(
            ModelWeek(
                starts_on=starts_on,
                parcels=n,
                blooming=sum(i.bloom_state == "blooming" for i in items) / n,
                low_nectar=sum(i.nectar_state == "low_nectar" for i in items) / n,
                missing=sum(i.bloom_provenance.kind == "Missing" for i in items) / n,
            )
        )
    return dict(result)


def fetch_model(
    api: str, years: Sequence[int]
) -> dict[int, dict[str, list[ModelWeek]]]:
    """Fetch ``/parcels`` and ``/timeline`` for each year from the running API.

    Raises:
        httpx.HTTPError: The API is unreachable or answered with an error.
    """
    with httpx.Client(base_url=api, timeout=TIMEOUT_S) as client:
        parcels = _PARCELS.validate_json(_get(client, "/parcels"))
        model: dict[int, dict[str, list[ModelWeek]]] = {}
        for year in years:
            timeline = TimelineResponse.model_validate_json(
                _get(client, "/timeline", {"year": year})
            )
            model[year] = summarise(parcels, timeline.parcel_weeks)
    return model


def _get(
    client: httpx.Client, path: str, params: dict[str, int] | None = None
) -> bytes:
    response = client.get(path, params=params)
    response.raise_for_status()
    return response.content


def fetch_weather(
    location: tuple[float, float], years: Sequence[int], cache_dir: Path
) -> list[Weather]:
    """Daily POWER Tmax, Tmin and wind at a (lon, lat), January-August of each year.

    One request covers all years; days outside those months are dropped.

    Raises:
        httpx.HTTPError: POWER request failed.
    """
    lon, lat = location
    end = min(date(max(years), 8, 31), date.today())
    series = daily_point(
        lat, lon, date(min(years), 1, 1), end, WEATHER_PARAMS, cache_dir=cache_dir
    )
    tmax, tmin, wind = (series.values[p] for p in WEATHER_PARAMS)
    return [
        Weather(d, hi, lo, ws)
        for d, hi, lo, ws in zip(series.days, tmax, tmin, wind, strict=True)
        if d.year in years and d.month <= LAST_MONTH
    ]
