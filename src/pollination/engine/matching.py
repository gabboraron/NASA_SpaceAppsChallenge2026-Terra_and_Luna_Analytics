"""Matching engine (WP12): hard filters, warnings and an explainable ranking.

A pure function. Hard filters block a parcel and say why (D15 for Natura 2000);
the rest are ranked by a weighted sum of three terms whose weights live in
``data/ranking.json`` (D14): how much of the bloom window the beekeeper can cover,
how close the parcel is, and how well the bloom timing is evidenced. The number
itself is never shown, only the reasons, warnings and what is still missing.
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Literal

from pollination import models as m
from pollination.datafiles import CalculatorDefaults, Ranking
from pollination.engine.calculator import prefill
from pollination.engine.timeline import in_year
from pollination.geo import NATURA_BUFFER_M, centroid, travel_distance_km

type Confidence = Literal["low", "medium", "high"]

HIGH_CONFIDENCE = 0.9  # evidence value of the bloom timing at or above: "high"
MEDIUM_CONFIDENCE = 0.6  # at or above: "medium", below: "low"


@dataclass(frozen=True)
class _Assessment:
    """One parcel's card (unranked) and the score that orders the open cards."""

    card: m.MatchCard
    score: float


def _bloom_window(parcel: m.Parcel, week: m.ParcelWeek) -> m.Window | None:
    """The bloom window of the season: modelled, else the grower's declaration."""
    if week.estimated_bloom is not None:
        return week.estimated_bloom
    if parcel.declared_bloom is None:
        return None
    year = week.starts_on.year
    return m.Window(
        start=in_year(parcel.declared_bloom.start, year),
        end=in_year(parcel.declared_bloom.end, year),
    )


def _days(window: m.Window) -> int:
    """Inclusive number of days in a window."""
    return (window.end - window.start).days + 1


def _overlap_days(a: m.Window, b: m.Window) -> int:
    """Inclusive days two windows have in common."""
    start, end = max(a.start, b.start), min(a.end, b.end)
    return max(0, (end - start).days + 1)


def _span(window: m.Window) -> str:
    """``26 Apr - 8 May`` for messages."""
    return f"{window.start:%d %b} - {window.end:%d %b}"


def _confidence(evidence: float) -> Confidence:
    """Confidence label from the evidence value of the bloom timing."""
    if evidence >= HIGH_CONFIDENCE:
        return "high"
    return "medium" if evidence >= MEDIUM_CONFIDENCE else "low"


def _assess(
    keeper: m.Beekeeper,
    parcel: m.Parcel,
    week: m.ParcelWeek,
    defaults: CalculatorDefaults,
    ranking: Ranking,
) -> _Assessment:
    """Filter, explain and score one parcel for one beekeeper and week."""
    distance = travel_distance_km(keeper.home, centroid(parcel.geometry))
    km = distance.value or 0.0
    window = _bloom_window(parcel, week)
    available = m.Window(
        start=in_year(keeper.availability.start, week.starts_on.year),
        end=in_year(keeper.availability.end, week.starts_on.year),
    )
    overlap = _overlap_days(window, available) if window else 0

    blocks: list[str] = []
    if parcel.natura_status == "inside":
        blocks.append("Inside a Natura 2000 site: hives cannot be placed")
    if km > keeper.max_distance_km:
        blocks.append(
            f"Estimated road distance {km:.1f} km exceeds the beekeeper's "
            f"{keeper.max_distance_km:g} km limit"
        )
    wanted = parcel.requested_colonies
    if wanted is not None and wanted > keeper.colonies:
        blocks.append(f"Requested {wanted} colonies, beekeeper has {keeper.colonies}")
    if window is not None and overlap == 0:
        blocks.append(
            f"Bloom window {_span(window)} does not overlap the beekeeper's "
            f"availability {_span(available)}"
        )

    evidence = ranking.provenance_confidence[week.bloom_provenance.kind]
    warnings: list[str] = []
    if parcel.natura_status == "buffer_overlap":
        warnings.append(f"Natura 2000 site within {NATURA_BUFFER_M / 1000:g} km")
    if blocks:
        card = m.MatchCard(
            beekeeper_id=keeper.id,
            parcel_id=parcel.id,
            rank=None,
            blocked=True,
            reasons=blocks,
            missing_items=[],
            warnings=warnings,
            confidence="low",
            distance_km=distance,
            calculator_input=None,
        )
        return _Assessment(card, 0.0)

    reasons = [f"Distance {km:.1f} km <= {keeper.max_distance_km:g} km max"]
    missing = ["Pesticide spray calendar unconfirmed"]
    if window is None:
        missing.append("Bloom window (no estimate or declaration)")
    else:
        reasons.insert(0, f"Bloom window overlaps availability by {overlap} days")
    if week.bloom_state == "blooming":
        reasons.append("Blooming in the selected week")
    if week.bloom_provenance.kind != "Observed":
        missing.append("Field confirmation")
    if week.bloom_provenance.kind == "Reported":
        warnings.append("Bloom timing is only the grower's declaration")
    if week.nectar_state == "low_nectar":
        warnings.append("Low nectar expected: dry soil (heuristic)")

    weights = ranking.weights
    coverage = overlap / _days(window) if window else 0.0
    closeness = (
        max(0.0, 1 - km / keeper.max_distance_km) if keeper.max_distance_km else 0.0
    )
    score = (
        weights.overlap_days * coverage
        + weights.inverse_distance * closeness
        + weights.provenance_confidence * evidence
    )
    card = m.MatchCard(
        beekeeper_id=keeper.id,
        parcel_id=parcel.id,
        rank=None,
        blocked=False,
        reasons=reasons,
        missing_items=missing,
        warnings=warnings,
        confidence=_confidence(evidence),
        distance_km=distance,
        calculator_input=prefill(keeper, parcel, defaults),
    )
    return _Assessment(card, score)


def match(
    keeper: m.Beekeeper,
    parcels: Sequence[m.Parcel],
    weeks: Mapping[str, m.ParcelWeek],
    defaults: CalculatorDefaults,
    ranking: Ranking,
) -> list[m.MatchCard]:
    """Rank the parcels that fit a beekeeper's goal, blocked ones last.

    Parcels of the other service type are not candidates and are left out.

    Args:
        keeper: The beekeeper looking for placements.
        parcels: All listed parcels.
        weeks: Each parcel's timeline week for the selected season and week,
            keyed by parcel id (every candidate parcel must be present).
        defaults: Calculator assumptions for values no actor states.
        ranking: Ranking weights and the evidence value of each provenance kind.

    Returns:
        Open cards rank 1..n best first, then blocked cards without a rank.
    """
    assessed = [
        _assess(keeper, p, weeks[p.id], defaults, ranking)
        for p in parcels
        if p.service_type == keeper.goal
    ]
    open_ = sorted(
        (a for a in assessed if not a.card.blocked),
        key=lambda a: (-a.score, a.card.distance_km.value or 0.0, a.card.parcel_id),
    )
    blocked = [a.card for a in assessed if a.card.blocked]
    ranked = [a.card.model_copy(update={"rank": i}) for i, a in enumerate(open_, 1)]
    return ranked + blocked
