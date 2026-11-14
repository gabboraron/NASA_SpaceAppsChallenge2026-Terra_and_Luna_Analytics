"""Core types of the verification framework: settings, inputs, results, report."""

from __future__ import annotations

import csv
import io
import tomllib
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel

THRESHOLDS_FILE = Path(__file__).with_name("thresholds.toml")

type MonthDay = tuple[int, int]
type Metric = float | int | str | bool | None


# --- settings -----------------------------------------------------------------


class SignalSettings(BaseModel):
    """How a hive weight series becomes nectar flows."""

    night_hour_end: int
    max_daily_jump_kg: float
    min_flow_day_kg: float
    max_gap_days: int
    min_flow_total_kg: float


class CropWindow(BaseModel):
    """Calendar window ("MM-DD", "MM-DD") used to attribute a flow to a crop."""

    window: tuple[str, str]

    def contains(self, day: date) -> bool:
        """Return whether ``day`` falls inside the window of its own year."""
        start, end = (_month_day(s) for s in self.window)
        return start <= (day.month, day.day) <= end


class ModelSettings(BaseModel):
    """How the model timeline is summarised."""

    bloom_share: float


class Gates(BaseModel):
    """Pass/fail limits of the gated scenarios, in days."""

    onset_days: float
    shift_days: float
    sunflower_peak_days: float


class GddSettings(BaseModel):
    """Growing-degree-day accumulation compared in scenario S3."""

    base_temps_c: list[float]
    start: str
    cv_ok: float


class FlightSettings(BaseModel):
    """Bee flight-weather rule (plan WP13)."""

    tmax_c: float
    wind_ms: float


class InatSettings(BaseModel):
    """iNaturalist query for the black-locust reference."""

    taxon_id: int
    bbox: tuple[float, float, float, float]
    min_obs: int


class Pep725Settings(BaseModel):
    """Selection of optional PEP725 flowering records."""

    radius_km: float
    bbch: list[int]


class Thresholds(BaseModel):
    """Everything in ``thresholds.toml``."""

    reference_location: tuple[float, float]
    reference_years: list[int]
    signal: SignalSettings
    crops: dict[str, CropWindow]
    model: ModelSettings
    gates: Gates
    gdd: GddSettings
    flight: FlightSettings
    inat: InatSettings
    pep725: Pep725Settings


def load_thresholds(path: Path = THRESHOLDS_FILE) -> Thresholds:
    """Read and validate the thresholds file."""
    return Thresholds.model_validate(tomllib.loads(path.read_text("utf-8")))


def _month_day(text: str) -> MonthDay:
    month, day = text.split("-")
    return int(month), int(day)


# --- inputs -------------------------------------------------------------------


@dataclass(frozen=True)
class ModelWeek:
    """One timeline week of one crop, summarised over its parcels.

    Attributes:
        starts_on: First day of the timeline week.
        parcels: Parcels of the crop in the timeline.
        blooming: Share of those parcels in ``blooming`` state.
        low_nectar: Share of those parcels flagged ``low_nectar``.
        missing: Share whose bloom provenance is ``Missing`` (no evidence).
    """

    starts_on: date
    parcels: int
    blooming: float
    low_nectar: float
    missing: float


@dataclass(frozen=True)
class Weather:
    """One POWER day at the reference location."""

    day: date
    tmax: float | None
    tmin: float | None
    wind: float | None


@dataclass(frozen=True)
class PhenoRecord:
    """One flowering observation (normalised PEP725 export row)."""

    crop: str
    year: int
    bbch: int
    day: date
    lon: float
    lat: float


@dataclass
class Context:
    """All inputs of one verification run; built live or from synthetic data.

    Attributes:
        thresholds: Settings and gates.
        model: Year -> crop -> weekly summary of the model timeline.
        hives: Hive id -> foraging day -> net weight change in kg (None: hive work).
        weather: POWER days at the reference location, any years.
        inat: Year -> ISO week -> observation count of the iNaturalist taxon.
        pep725: Optional flowering records.
        notes: Problems met while loading (shown in the report).
    """

    thresholds: Thresholds
    model: dict[int, dict[str, list[ModelWeek]]] = field(
        default_factory=dict[int, dict[str, list[ModelWeek]]]
    )
    hives: dict[str, dict[date, float | None]] = field(
        default_factory=dict[str, dict[date, float | None]]
    )
    weather: list[Weather] = field(default_factory=list[Weather])
    inat: dict[int, dict[int, int]] = field(default_factory=dict[int, dict[int, int]])
    pep725: list[PhenoRecord] = field(default_factory=list[PhenoRecord])
    notes: list[str] = field(default_factory=list[str])


# --- results ------------------------------------------------------------------


class Status(StrEnum):
    """Outcome of one scenario."""

    PASS = "PASS"  # noqa: S105 -- a status, not a password; gated scenario within its limits
    FAIL = "FAIL"  # gated scenario outside its limits
    REPORTED = "REPORTED"  # informative scenario, no gate
    INSUFFICIENT = "INSUFFICIENT"  # model or reference data missing; nothing judged


@dataclass(frozen=True)
class Result:
    """Outcome, numbers and explanation of one scenario."""

    id: str
    question: str
    status: Status
    metrics: dict[str, Metric] = field(default_factory=dict[str, Metric])
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class Scenario:
    """A named check: a question and the function that answers it."""

    id: str
    question: str
    run: Callable[[Context], Result]


def run_all(
    ctx: Context, scenarios: Sequence[Scenario], only: set[str] | None = None
) -> list[Result]:
    """Run scenarios in order; an exception becomes an INSUFFICIENT result."""
    results: list[Result] = []
    for scenario in scenarios:
        if only and scenario.id not in only:
            continue
        try:
            results.append(scenario.run(ctx))
        except (KeyError, ValueError, ZeroDivisionError) as err:
            results.append(
                Result(
                    scenario.id,
                    scenario.question,
                    Status.INSUFFICIENT,
                    notes=(f"Could not evaluate: {err!r}",),
                )
            )
    return results


def _fmt(value: Metric) -> str:
    if isinstance(value, float):
        return f"{value:.2f}"
    return "n/a" if value is None else str(value)


def render_markdown(results: Sequence[Result], notes: Sequence[str] = ()) -> str:
    """Render the results as a Markdown report."""
    lines = [
        "# Verification report",
        "",
        "| ID | Question | Status |",
        "|---|---|---|",
        *(f"| {r.id} | {r.question} | **{r.status}** |" for r in results),
        "",
    ]
    for r in results:
        lines += [f"## {r.id}: {r.question}", "", f"Status: **{r.status}**", ""]
        lines += [f"- `{k}`: {_fmt(v)}" for k, v in r.metrics.items()]
        lines += [f"- {n}" for n in r.notes]
        lines.append("")
    if notes:
        lines += ["## Loading notes", "", *(f"- {n}" for n in notes), ""]
    return "\n".join(lines)


def render_csv(results: Sequence[Result]) -> str:
    """Render every metric as one ``id,status,metric,value`` row."""
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(["id", "status", "metric", "value"])
    for r in results:
        for key, value in r.metrics.items():
            writer.writerow([r.id, r.status, key, _fmt(value)])
    return out.getvalue()
