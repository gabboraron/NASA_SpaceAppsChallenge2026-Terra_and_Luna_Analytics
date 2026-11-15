"""Tests for the move calculator (WP9).

The worked-example inputs below are reconstructed from the figures in issue #15
(contribution 1,568.48; sensitivity table; break-even about EUR 28.25) because the
business brief is not in the repository. Replace `example()` with the brief's inputs
once available; the expected numbers must still hold.
"""

import pytest

from pollination.config import Settings
from pollination.datafiles import CalculatorDefaults, load_catalog
from pollination.engine.calculator import break_even_fee, calculate, prefill
from pollination.models import Beekeeper, CalculatorInput, Parcel


def example(**overrides: float | str) -> CalculatorInput:
    """Return the reconstructed worked example (40 colonies at EUR 60)."""
    values: dict[str, float | str] = {
        "service_type": "pollination",
        "colonies": 40,
        "distance_km": 50,
        "fee_per_colony": 60,
        "legs": 4,
        "fuel_l_per_100km": 12,
        "fuel_price_per_l": 1.65,
        "vehicle_cost_per_km": 0.3,
        "driving_hours": 6,
        "loading_hours": 6,
        "hourly_labor_cost": 15,
        "extra_feed_cost": 200,
        "other_placement_cost": 159.92,
        "alternative_contribution": 400,
    }
    return CalculatorInput.model_validate(values | overrides)


def test_worked_example() -> None:
    base = calculate(example()).base
    assert base.revenue == pytest.approx(2400)
    assert base.commission == pytest.approx(192)
    assert base.contribution == pytest.approx(1568.48)
    assert base.benefit_vs_alternative == pytest.approx(1168.48)


@pytest.mark.parametrize(
    ("fee", "contribution", "benefit"),
    [(30, 464.48, 64.48), (60, 1568.48, 1168.48), (80, 2304.48, 1904.48)],
)
def test_sensitivity(fee: float, contribution: float, benefit: float) -> None:
    base = calculate(example(fee_per_colony=fee)).base
    assert base.contribution == pytest.approx(contribution)
    assert base.benefit_vs_alternative == pytest.approx(benefit)


def test_break_even_fee() -> None:
    assert break_even_fee(example()) == pytest.approx(28.25, abs=0.01)


def test_bands_use_price_uncertainty_and_extra_trip() -> None:
    result = calculate(example())
    assert result.high.revenue == pytest.approx(2400 * 1.2)
    assert result.low.revenue == pytest.approx(2400 * 0.8)
    # One extra round trip = 2 legs: +50% fuel, vehicle and driving labor.
    extra = 0.5 * (4 * 50 * 12 / 100 * 1.65 + 4 * 50 * 0.3 + 6 * 15)
    assert result.low.transport_cost - result.base.transport_cost == pytest.approx(
        extra
    )
    assert result.low.contribution < result.base.contribution
    assert result.base.contribution < result.high.contribution


def test_forage_pays_no_commission() -> None:
    base = calculate(example(service_type="forage")).base
    assert base.commission == 0
    assert base.contribution == pytest.approx(1568.48 + 192)


def test_honey_margin_adds_to_contribution() -> None:
    base = calculate(example(honey_margin=100)).base
    assert base.contribution == pytest.approx(1668.48)


def test_move_verdict() -> None:
    result = calculate(example())
    assert result.verdict == "move"


def test_do_not_move_message_states_shortfall() -> None:
    result = calculate(example(distance_km=180, alternative_contribution=2000))
    assert result.verdict == "do_not_move"
    shortfall = -result.base.benefit_vs_alternative
    assert (
        result.message
        == f"Staying at base apiary gives €{shortfall:,.2f} more contribution."
    )
    assert "net profit" not in result.message.lower()


# --- prefill from a beekeeper and a parcel (WP19) ----------------------------


def demo() -> tuple[dict[str, Beekeeper], dict[str, Parcel], CalculatorDefaults]:
    """Return the committed beekeepers, parcels and calculator defaults by id."""
    data = load_catalog(Settings())
    return (
        {b.id: b for b in data.actors.beekeepers},
        {p.id: p for p in data.parcels},
        data.calculator,
    )


def test_prefill_every_field_has_a_provenance() -> None:
    keepers, parcels, defaults = demo()
    inputs = prefill(keepers["B1"], parcels["P03"], defaults)
    fields = set(CalculatorInput.model_fields) - {"provenance"}
    assert inputs.provenance.keys() == fields
    assert inputs.provenance["distance_km"].kind == "Estimated"
    assert inputs.provenance["driving_hours"].kind == "Estimated"
    assert inputs.provenance["fee_per_colony"].kind == "Reported"
    # Planning assumptions nobody reported are labelled Estimated.
    assert inputs.provenance["fuel_price_per_l"].kind == "Estimated"
    assert inputs.provenance["legs"].kind == "Estimated"


def test_prefill_uses_listing_beekeeper_and_distance() -> None:
    keepers, parcels, defaults = demo()
    inputs = prefill(keepers["B1"], parcels["P03"], defaults)
    assert inputs.colonies == 20  # the grower asks for 20; B1 has 50
    assert inputs.fee_per_colony == 60
    assert inputs.fuel_l_per_100km == keepers["B1"].vehicle_l_per_100km
    assert inputs.alternative_contribution == 400
    assert inputs.distance_km == pytest.approx(17.7, abs=0.1)
    assert inputs.driving_hours == pytest.approx(
        inputs.legs * inputs.distance_km / defaults.average_speed_kmh
    )


def test_prefill_caps_colonies_at_what_the_beekeeper_has() -> None:
    keepers, parcels, defaults = demo()
    assert prefill(keepers["B2"], parcels["P08"], defaults).colonies == 40


def test_near_beekeeper_moves_far_one_does_not() -> None:
    """Plan WP19: B1 shows a positive benefit, B2 a do-not-move, for one orchard."""
    keepers, parcels, defaults = demo()
    near = calculate(prefill(keepers["B1"], parcels["P03"], defaults))
    far = calculate(prefill(keepers["B2"], parcels["P03"], defaults))
    assert near.verdict == "move"
    assert near.base.benefit_vs_alternative == pytest.approx(591.04, abs=0.5)
    assert far.verdict == "do_not_move"
    assert far.base.benefit_vs_alternative == pytest.approx(-84.85, abs=0.5)


def test_forage_prefill_flags_the_missing_honey_margin() -> None:
    keepers, parcels, defaults = demo()
    inputs = prefill(keepers["B3"], parcels["P15"], defaults)
    assert inputs.service_type == "forage"
    assert inputs.fee_per_colony == 0
    assert inputs.colonies == 20  # no request on forage listings: B3's colonies
    assert inputs.honey_margin == 0
    assert inputs.provenance["honey_margin"].kind == "Missing"
