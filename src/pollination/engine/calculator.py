"""Move economics: contribution after incremental costs and benefit vs alternative."""

from typing import Literal

from pollination.models import CalculatorInput, CalculatorResult, Scenario

COMMISSION_RATE = 0.08
ROUND_TRIP_LEGS = 2


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
    commission = (
        COMMISSION_RATE * revenue if inputs.service_type == "pollination" else 0
    )
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
            f"Staying at base apiary yields €{-base.benefit_vs_alternative:,.2f} more."
        )
    else:
        verdict = "move"
        message = (
            f"Moving yields €{base.benefit_vs_alternative:,.2f} more than the "
            "alternative."
        )
    return CalculatorResult(
        low=low, base=base, high=high, verdict=verdict, message=message
    )


def break_even_fee(inputs: CalculatorInput) -> float:
    """Return the fee per colony at which base benefit vs the alternative is zero.

    Args:
        inputs: Scenario assumptions; the input fee is ignored.

    Returns:
        Fee in euros per colony (contribution is linear in the fee).
    """
    at_zero = _scenario(inputs.model_copy(update={"fee_per_colony": 0}), 1, 0)
    net_rate = 1 - (COMMISSION_RATE if inputs.service_type == "pollination" else 0)
    return -at_zero.benefit_vs_alternative / (inputs.colonies * net_rate)
