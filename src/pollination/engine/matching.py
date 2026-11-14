"""Placeholder matching until WP12: distance-ranked cards with calculator inputs."""

from pollination import models as m
from pollination.datafiles import CalculatorDefaults
from pollination.engine.calculator import prefill
from pollination.geo import NATURA_BUFFER_M


def match(
    keeper: m.Beekeeper,
    parcels: list[m.Parcel],
    defaults: CalculatorDefaults,
    when: str,
) -> list[m.MatchCard]:
    """Return one card per parcel of the beekeeper's goal, nearest first.

    Parcels inside a Natura 2000 site are listed as blocked; every open card
    carries prefilled calculator inputs. Confidence stays low: distance only.

    Args:
        keeper: The beekeeper looking for placements.
        parcels: All listed parcels.
        defaults: Calculator assumptions for values no actor states.
        when: Season and week label shown in the placeholder warning.

    Returns:
        Cards in rank order, blocked ones without a rank.
    """
    pairs = sorted(
        (
            (p, prefill(keeper, p, defaults))
            for p in parcels
            if p.service_type == keeper.goal
        ),
        key=lambda pair: pair[1].distance_km,
    )
    cards: list[m.MatchCard] = []
    rank = 0
    for parcel, calc in pairs:
        blocked = parcel.natura_status == "inside"
        warnings = [f"Preliminary ranking by distance only ({when})"]
        if parcel.natura_status == "buffer_overlap":
            warnings.append(f"Natura 2000 site within {NATURA_BUFFER_M / 1000:g} km")
        if calc.distance_km > keeper.max_distance_km:
            warnings.append(
                f"Beyond the beekeeper's {keeper.max_distance_km:g} km limit"
            )
        if blocked:
            reasons = ["Inside a Natura 2000 site: hives cannot be placed"]
            missing: list[str] = []
        else:
            rank += 1
            reasons = [f"Estimated road distance {calc.distance_km:.1f} km"]
            missing = ["Field confirmation"]
        cards.append(
            m.MatchCard(
                beekeeper_id=keeper.id,
                parcel_id=parcel.id,
                rank=None if blocked else rank,
                blocked=blocked,
                reasons=reasons,
                missing_items=missing,
                warnings=warnings,
                confidence="low",
                distance_km=m.Measurement(
                    value=calc.distance_km,
                    provenance=calc.provenance["distance_km"],
                ),
                calculator_input=None if blocked else calc,
            )
        )
    return cards
