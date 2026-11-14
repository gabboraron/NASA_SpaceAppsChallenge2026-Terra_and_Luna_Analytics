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
from typing import Annotated

from pydantic import BaseModel, BeforeValidator

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


def _month_day(value: object) -> object:
    """Parse "MM-DD" into (month, day); other values pass to pydantic as is."""
    if isinstance(value, str):
        month, day = value.split("-")
        return int(month), int(day)
    return value


type MonthDayField = Annotated[MonthDay, BeforeValidator(_month_day)]


class CropWindow(BaseModel):
    """Calendar window ("MM-DD", "MM-DD") used to attribute a flow to a crop."""

    window: tuple[MonthDayField, MonthDayField]

    def contains(self, day: date) -> bool:
        """Return whether ``day`` falls inside the window of its own year."""
        return self.window[0] <= (day.month, day.day) <= self.window[1]

    def bounds(self, year: int) -> tuple[date, date]:
        """First and last day of the window in ``year``."""
        return date(year, *self.window[0]), date(year, *self.window[1])


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
    start: MonthDayField
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
    day: date


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
    ERROR = "ERROR"  # the scenario crashed: a bug, not a data gap


@dataclass(frozen=True)
class Outcome:
    """What a scenario function returns: status, numbers and explanation."""

    status: Status
    metrics: dict[str, Metric] = field(default_factory=dict[str, Metric])
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class Result(Outcome):
    """An outcome labelled with its scenario."""

    id: str = ""
    question: str = ""


@dataclass(frozen=True)
class Scenario:
    """A named check: a question and the function that answers it."""

    id: str
    question: str
    run: Callable[[Context], Outcome]


def run_all(
    ctx: Context, scenarios: Sequence[Scenario], only: set[str] | None = None
) -> list[Result]:
    """Run scenarios in order; a crash becomes an ERROR result, not a data gap."""
    results: list[Result] = []
    for scenario in scenarios:
        if only and scenario.id not in only:
            continue
        try:
            out = scenario.run(ctx)
        except Exception as err:  # report every crash, keep running the others
            out = Outcome(Status.ERROR, notes=(f"Scenario crashed: {err!r}",))
        results.append(
            Result(out.status, out.metrics, out.notes, scenario.id, scenario.question)
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
