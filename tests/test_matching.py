"""Matching engine (WP12): hard filters, warnings and the explainable ranking.

Uses the committed demo data (actors, parcels, calculator defaults, ranking weights)
and the real timeline engine with every NASA source missing, so bloom comes from the
growers' declared windows and needs no network.
"""

from collections.abc import Mapping, Sequence
from datetime import date
from typing import Literal

from pollination import models as m
from pollination.config import Settings
from pollination.datafiles import load_catalog, load_ranking
from pollination.engine.calculator import calculate
from pollination.engine.matching import match
from pollination.engine.timeline import SeasonInputs, build_timeline

SETTINGS = Settings()
CATALOG = load_catalog(SETTINGS)
RANKING = load_ranking(SETTINGS.data_dir)
KEEPERS = {k.id: k for k in CATALOG.actors.beekeepers}
PARCELS = {p.id: p for p in CATALOG.parcels}
OFFLINE = SeasonInputs(power={}, hls="offline test", smap="offline test")
ORCHARDS = {"apple", "sour_cherry"}

type Kind = Literal["Reported", "Observed", "Estimated", "Missing"]


def week_of(year: int = 2024, week: int = 9) -> dict[str, m.ParcelWeek]:
    """The timeline week of every parcel, from declared bloom windows only."""
    season = m.Season(year)
    timeline = build_timeline(season, CATALOG.parcels, CATALOG.phenology, OFFLINE, {})
    return {w.parcel_id: w for w in timeline.parcel_weeks if w.week == week}


def run(
    keeper: str,
    parcels: Sequence[m.Parcel] | None = None,
    weeks: Mapping[str, m.ParcelWeek] | None = None,
) -> list[m.MatchCard]:
    """Match one demo beekeeper (default: all parcels, 2024 week 9)."""
    return match(
        KEEPERS[keeper],
        list(parcels or CATALOG.parcels),
        weeks or week_of(),
        CATALOG.calculator,
        RANKING,
    )


def by_parcel(cards: Sequence[m.MatchCard]) -> dict[str, m.MatchCard]:
    """Index cards by parcel id."""
    return {c.parcel_id: c for c in cards}


def test_b1_top_match_is_an_orchard() -> None:
    """The ticket's first done-when: B1's best open card is an orchard."""
    top = run("B1")[0]
    assert top.rank == 1
    assert not top.blocked
    assert PARCELS[top.parcel_id].crop in ORCHARDS


def test_each_beekeeper_gets_only_parcels_of_their_goal() -> None:
    """B3 (forage) sees forage parcels only; B1 and B2 see pollination parcels."""
    for keeper_id, goal in (
        ("B1", "pollination"),
        ("B2", "pollination"),
        ("B3", "forage"),
    ):
        cards = run(keeper_id)
        assert cards
        assert {PARCELS[c.parcel_id].service_type for c in cards} == {goal}


def test_a_natura_inside_parcel_is_always_blocked() -> None:
    """Hives cannot go inside a Natura 2000 site: blocked, unranked, with the reason."""
    inside = {p.id for p in CATALOG.parcels if p.natura_status == "inside"}
    assert inside
    for keeper_id in KEEPERS:
        for card in run(keeper_id):
            if card.parcel_id in inside:
                assert card.blocked
                assert card.rank is None
                assert card.calculator_input is None
                assert any("Natura 2000" in r for r in card.reasons)


def test_open_cards_are_ranked_from_one_and_come_before_blocked_ones() -> None:
    """Ranks run 1..n without gaps; blocked cards follow, unranked."""
    for keeper_id in KEEPERS:
        cards = run(keeper_id)
        open_cards = [c for c in cards if not c.blocked]
        assert [c.rank for c in open_cards] == list(range(1, len(open_cards) + 1))
        assert cards[: len(open_cards)] == open_cards
        assert all(c.rank is None for c in cards[len(open_cards) :])


def test_b2_only_matches_within_its_distance_limit() -> None:
    """B2 is far away: parcels beyond 250 km road distance are blocked, not offered."""
    cards = run("B2")
    limit = KEEPERS["B2"].max_distance_km
    open_cards = [c for c in cards if not c.blocked]
    assert open_cards
    assert all(
        c.distance_km.value is not None and c.distance_km.value <= limit
        for c in open_cards
    )
    too_far = by_parcel(cards)["P08"]  # 251 km road distance against a 250 km limit
    assert too_far.blocked
    assert any("limit" in r for r in too_far.reasons)


def test_b2_best_match_should_not_move_the_hives() -> None:
    """The demo story: B2's top match is so far away that the calculator says no.

    Not every B2 parcel loses: P05 asks for 35 colonies, and 35 x 60 EUR outweighs
    the transport even over 236 km. The story holds for the best-ranked card.
    """
    best = run("B2")[0]
    assert best.calculator_input is not None
    assert calculate(best.calculator_input).verdict == "do_not_move"


def test_requested_colonies_above_what_the_beekeeper_has_block_the_parcel() -> None:
    """P08 asks for 60 colonies; B1 has 50, so it cannot be served."""
    card = by_parcel(run("B1"))["P08"]
    assert card.blocked
    assert any("60" in r and "50" in r for r in card.reasons)


WEEK = week_of()


def variant(  # noqa: PLR0913  # one keyword per thing a test may change
    parcel_id: str,
    new_id: str,
    *,
    bloom: tuple[str, str] | None = None,
    no_bloom: bool = False,
    provenance: m.Provenance | None = None,
    nectar: m.NectarState | None = None,
) -> tuple[m.Parcel, m.ParcelWeek]:
    """A copy of a demo parcel and its week with one thing changed (same location)."""
    parcel = PARCELS[parcel_id].model_copy(update={"id": new_id})
    if bloom is not None:
        window = m.Window(
            start=date.fromisoformat(bloom[0]), end=date.fromisoformat(bloom[1])
        )
        parcel = parcel.model_copy(update={"declared_bloom": window})
    if no_bloom:
        parcel = parcel.model_copy(update={"declared_bloom": None})
    update: dict[str, object] = {"parcel_id": new_id}
    if provenance is not None:
        update["bloom_provenance"] = provenance
    if nectar is not None:
        update["nectar_state"] = nectar
    return parcel, WEEK[parcel_id].model_copy(update=update)


def match_variants(
    keeper: str, *variants: tuple[m.Parcel, m.ParcelWeek]
) -> dict[str, m.MatchCard]:
    """Match a beekeeper against variant parcels only, indexed by parcel id."""
    parcels = [p for p, _ in variants]
    weeks = {p.id: w for p, w in variants}
    return by_parcel(run(keeper, parcels, weeks))


def evidence(kind: Kind) -> m.Provenance:
    """A bloom provenance of the given kind."""
    return m.Provenance(kind=kind, source="test", observed_at=None)


def test_overlap_days_are_reported_and_follow_the_season_year() -> None:
    """The declared dates are 2024; a 2022 season uses the same calendar days."""
    for year in (2024, 2022):
        cards = by_parcel(run("B1", weeks=week_of(year, 9)))
        assert "Bloom window overlaps availability by 17 days" in cards["P03"].reasons


def test_longer_bloom_coverage_ranks_higher() -> None:
    """With everything else equal, covering more of the bloom window wins."""
    cards = match_variants(
        "B1",
        variant("P01", "a_half", bloom=("2024-03-20", "2024-04-10")),
        variant("P01", "b_full", bloom=("2024-04-22", "2024-05-08")),
    )
    # ids sort the other way round, so a tie in score could not produce this order
    assert cards["b_full"].rank == 1
    assert cards["a_half"].rank == 2


def test_nearer_parcel_ranks_higher_when_the_bloom_is_the_same() -> None:
    """P03 and P01 are both apple orchards with the same declared bloom."""
    cards = by_parcel(run("B1"))
    near, far = cards["P03"], cards["P01"]
    assert near.distance_km.value is not None
    assert far.distance_km.value is not None
    assert near.distance_km.value < far.distance_km.value
    assert near.rank is not None
    assert far.rank is not None
    assert near.rank < far.rank


def test_closeness_counts_next_to_bloom_coverage() -> None:
    """A parcel 13 km nearer wins despite covering 95 percent of its bloom, not 100."""
    near = variant("P03", "a_near", bloom=("2024-03-31", "2024-04-19"))
    far = variant("P09", "b_far", bloom=("2024-04-22", "2024-05-08"))
    cards = match_variants("B1", near, far)
    assert cards["a_near"].distance_km.value is not None
    assert cards["b_far"].distance_km.value is not None
    assert cards["a_near"].distance_km.value < cards["b_far"].distance_km.value
    assert cards["a_near"].rank == 1
    assert cards["b_far"].rank == 2


def test_stronger_evidence_ranks_higher_and_raises_confidence() -> None:
    """Observed beats Estimated beats Reported, and the label follows."""
    cards = match_variants(
        "B1",
        variant("P01", "reported", provenance=evidence("Reported")),
        variant("P01", "estimated", provenance=evidence("Estimated")),
        variant("P01", "observed", provenance=evidence("Observed")),
    )
    order = sorted(cards.values(), key=lambda c: c.rank or 99)
    assert [c.parcel_id for c in order] == ["observed", "estimated", "reported"]
    assert [c.confidence for c in order] == ["high", "medium", "low"]


def test_bloom_outside_the_availability_blocks_the_parcel() -> None:
    """A bloom window with no day in common with the availability is a hard block."""
    card = match_variants(
        "B1", variant("P01", "late", bloom=("2024-09-10", "2024-09-30"))
    )["late"]
    assert card.blocked
    assert any("does not overlap" in r for r in card.reasons)


def test_unknown_bloom_window_is_not_blocked_but_listed_as_missing() -> None:
    """No estimate and no declaration: still a candidate, with the gap named."""
    card = match_variants("B3", variant("P15", "unknown", no_bloom=True))["unknown"]
    assert not card.blocked
    assert any("Bloom window" in item for item in card.missing_items)
    assert not any("overlaps availability" in r for r in card.reasons)


def test_warnings_for_buffer_overlap_reported_bloom_and_low_nectar() -> None:
    """The three warnings of the ticket appear on an open card."""
    warned = match_variants("B1", variant("P03", "dry", nectar="low_nectar"))["dry"]
    assert any("Natura 2000 site within 3 km" in w for w in warned.warnings)
    assert any("grower's declaration" in w for w in warned.warnings)
    assert any("Low nectar" in w for w in warned.warnings)


def test_observed_bloom_drops_the_declaration_warning_and_field_check() -> None:
    """A verified bloom is neither 'only declared' nor missing a field confirmation."""
    card = match_variants(
        "B1", variant("P03", "seen", provenance=evidence("Observed"))
    )["seen"]
    assert not any("grower's declaration" in w for w in card.warnings)
    assert "Field confirmation" not in card.missing_items
