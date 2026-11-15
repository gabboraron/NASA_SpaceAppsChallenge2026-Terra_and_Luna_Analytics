// Pure helpers for the match panel and its map badges (WP18).
import type { MatchCard } from "../../api/client";

type Grouped = {
  /** Ranked cards, best first. */
  open: MatchCard[];
  /** Cards that cannot be placed, nearest first. */
  blocked: MatchCard[];
  /** Warnings every card carries: shown once above the list, not per card. */
  shared: string[];
};

/** Split cards into ranked and blocked, and lift warnings they all share. */
export function groupCards(cards: MatchCard[]): Grouped {
  const shared =
    cards.length > 1
      ? cards[0].warnings.filter((w) =>
          cards.every((c) => c.warnings.includes(w)),
        )
      : [];
  const open = cards
    .filter((c) => !c.blocked)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  const blocked = cards
    .filter((c) => c.blocked)
    .sort(
      (a, b) =>
        (a.distance_km.value ?? Infinity) - (b.distance_km.value ?? Infinity),
    );
  return { open, blocked, shared };
}

/** The card's own warnings, without the ones shown above the list. */
export const ownWarnings = (card: MatchCard, shared: string[]): string[] =>
  card.warnings.filter((w) => !shared.includes(w));

/** "11 possible placements", "1 possible placement". */
export const countText = (n: number): string =>
  `${n} possible placement${n === 1 ? "" : "s"}`;
