"""Move economics: contribution after incremental costs and benefit vs alternative."""

from typing import Literal

from pollination.datafiles import CalculatorDefaults
from pollination.geo import centroid, travel_distance_km
from pollination.models import (
    MAX_COLONIES,
    MIN_COLONIES,
    Beekeeper,
    CalculatorInput,
    CalculatorResult,
    CostSettings,
    Parcel,
    Provenance,
    Scenario,
)

COMMISSION_RATE = 0.08
ROUND_TRIP_LEGS = 2
LISTING = "Grower listing (illustrative)"
OWN_PROFILE = "Your profile"
OWN_COSTS = "Your cost settings"


def _scenario(
    inputs: CalculatorInput, price_factor: float, extra_legs: int
) -> Scenario:
    """Compute one scenario band in euros.

    Args:
        inputs: Base assumptions.
        price_factor: Multiplier applied to the fee per colony.
        extra_legs: One-way legs added on top of `inputs.legs`.

    Returns:
        Revenue, commission, costs, contribution and benefit vs the alternative.
    """
    legs = inputs.legs + extra_legs
    km = legs * inputs.distance_km
    hours_per_leg = inputs.driving_hours / inputs.legs if inputs.legs else 0.0
    fuel = km * inputs.fuel_l_per_100km / 100 * inputs.fuel_price_per_l
    vehicle = km * inputs.vehicle_cost_per_km
    driving = legs * hours_per_leg * inputs.hourly_labor_cost
    transport = fuel + vehicle + driving
    other = (
        inputs.loading_hours * inputs.hourly_labor_cost
        + inputs.extra_feed_cost
        + inputs.other_placement_cost
    )
    revenue = inputs.colonies * inputs.fee_per_colony * price_factor
    commission = _commission_rate(inputs) * revenue
    contribution = revenue - commission - transport - other + inputs.honey_margin
    return Scenario(
        revenue=revenue,
        commission=commission,
        transport_cost=transport,
        other_costs=other,
        contribution=contribution,
        benefit_vs_alternative=contribution - inputs.alternative_contribution,
    )


def calculate(inputs: CalculatorInput) -> CalculatorResult:
    """Compute low, base and high bands and the base-case verdict.

    Args:
        inputs: Editable scenario assumptions.

    Returns:
        Three scenarios plus a verdict worded as benefit relative to the alternative.
    """
    low = _scenario(
        inputs,
        1 - inputs.price_uncertainty,
        ROUND_TRIP_LEGS * inputs.extra_trips_low,
    )
    base = _scenario(inputs, 1, 0)
    high = _scenario(inputs, 1 + inputs.price_uncertainty, 0)
    verdict: Literal["move", "do_not_move"]
    if base.benefit_vs_alternative < 0:
        verdict = "do_not_move"
        message = (
            f"Staying at base apiary gives €{-base.benefit_vs_alternative:,.2f} "
            "more contribution."
        )
    else:
        verdict = "move"
        message = (
            f"Moving gives €{base.benefit_vs_alternative:,.2f} more contribution "
            "than the alternative."
        )
    return CalculatorResult(
        low=low, base=base, high=high, verdict=verdict, message=message
    )


def _commission_rate(inputs: CalculatorInput) -> float:
    """Share of the fee the marketplace keeps: pollination contracts only."""
    return COMMISSION_RATE if inputs.service_type == "pollination" else 0.0


def _source(
    kind: Literal["Reported", "Estimated", "Missing"], source: str, note: str = ""
) -> Provenance:
    return Provenance(kind=kind, source=source, observed_at=None, note=note)


def prefill(
    beekeeper: Beekeeper,
    parcel: Parcel,
    defaults: CalculatorDefaults,
    costs: CostSettings | None = None,
) -> CalculatorInput:
    """Build editable calculator inputs for moving a beekeeper's hives to a parcel.

    Listing values (fee, requested colonies) are Reported by the grower, vehicle and
    alternative by the beekeeper; distance and driving time are Estimated (plan D22);
    the rest are Estimated planning assumptions from ``data/calculator.json``, or
    Reported where the beekeeper set an own cost.

    Args:
        beekeeper: Who moves the hives.
        parcel: Where the hives go.
        defaults: Assumptions for values no actor states.
        costs: The beekeeper's own costs; each set value replaces its default.

    Returns:
        Inputs with a provenance for every field.
    """
    own = costs.model_dump(exclude_none=True) if costs else {}
    defaults = defaults.model_copy(update=own)
    keeper = (
        f"Beekeeper {beekeeper.id} profile (synthetic)"
        if beekeeper.synthetic
        else OWN_PROFILE
    )
    distance = travel_distance_km(beekeeper.home, centroid(parcel.geometry))
    km = distance.value or 0.0
    forage = parcel.service_type == "forage"
    has = beekeeper.colonies
    if listed := parcel.requested_colonies:
        wanted = min(listed, has)
        colonies_source = _source(
            "Reported", LISTING, f"Requested {listed}, beekeeper has {has}"
        )
    else:
        wanted = has
        colonies_source = _source("Reported", keeper, f"Beekeeper has {has}")
    colonies = max(MIN_COLONIES, min(MAX_COLONIES, wanted))
    assumed = _source("Estimated", defaults.source)

    def cost(name: str, note: str = "") -> Provenance:
        """Where a cost comes from: the beekeeper's setting, else the default."""
        if name in own:
            return _source("Reported", OWN_COSTS)
        return _source("Estimated", defaults.source, note)

    speed = "average_speed_kmh" in own
    return CalculatorInput(
        service_type=parcel.service_type,
        colonies=colonies,
        distance_km=km,
        fee_per_colony=0 if forage else parcel.fee_eur_per_colony or 0,
        legs=defaults.legs,
        fuel_l_per_100km=beekeeper.vehicle_l_per_100km,
        fuel_price_per_l=defaults.fuel_price_per_l,
        vehicle_cost_per_km=defaults.vehicle_cost_per_km,
        driving_hours=defaults.legs * km / defaults.average_speed_kmh,
        loading_hours=defaults.loading_hours,
        hourly_labor_cost=defaults.hourly_labor_cost,
        extra_feed_cost=defaults.extra_feed_cost,
        other_placement_cost=defaults.other_placement_cost,
        honey_margin=0,
        alternative_contribution=beekeeper.alternative_contribution_eur,
        price_uncertainty=defaults.price_uncertainty,
        extra_trips_low=defaults.extra_trips_low,
        provenance={
            "service_type": _source("Reported", LISTING),
            "colonies": colonies_source,
            "distance_km": distance.provenance,
            "fee_per_colony": _source(
                "Reported", LISTING, "Forage hosts pay no fee" if forage else ""
            ),
            "legs": cost("legs", "Deliver and collect"),
            "fuel_l_per_100km": _source("Reported", keeper),
            "fuel_price_per_l": cost("fuel_price_per_l"),
            "vehicle_cost_per_km": cost("vehicle_cost_per_km"),
            "driving_hours": _source(
                "Estimated",
                f"Trips x distance at {defaults.average_speed_kmh:g} km/h",
                "Your average speed" if speed else "",
            ),
            "loading_hours": cost("loading_hours"),
            "hourly_labor_cost": cost("hourly_labor_cost"),
            "extra_feed_cost": cost("extra_feed_cost"),
            "other_placement_cost": cost("other_placement_cost"),
            "honey_margin": _source(
                "Missing",
                "No honey estimate",
                "Forage moves earn through honey; enter your margin",
            )
            if forage
            else _source("Estimated", defaults.source, "Optional"),
            "alternative_contribution": _source(
                "Reported", keeper, "Staying at the home apiary"
            ),
            "price_uncertainty": assumed,
            "extra_trips_low": assumed,
        },
    )
