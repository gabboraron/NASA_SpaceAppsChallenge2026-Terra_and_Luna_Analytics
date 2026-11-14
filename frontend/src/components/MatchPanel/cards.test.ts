import { describe, expect, it } from "vitest";
import { matches } from "../../api/mocks";
import type { MatchCard } from "../../api/client";
import { countText, groupCards, ownWarnings } from "./cards";

const card = (
  id: string,
  rank: number | null,
  warnings: string[],
): MatchCard => ({
  beekeeper_id: "B1",
  parcel_id: id,
  rank,
  blocked: rank === null,
  reasons: [],
  missing_items: [],
  warnings,
  confidence: "low",
  distance_km: {
    value: 1,
    provenance: {
      kind: "Estimated",
      source: "t",
      observed_at: null,
      interpolated: false,
      note: "",
    },
  },
  calculator_input: null,
});

describe("groupCards", () => {
  it("orders ranked cards and keeps blocked ones apart", () => {
    const g = groupCards([
      card("A", 2, []),
      card("X", null, []),
      card("B", 1, []),
    ]);
    expect(g.open.map((c) => c.parcel_id)).toEqual(["B", "A"]);
    expect(g.blocked.map((c) => c.parcel_id)).toEqual(["X"]);
  });
  it("lifts warnings every card shares", () => {
    const g = groupCards([
      card("A", 1, ["Preliminary", "Natura"]),
      card("B", 2, ["Preliminary"]),
    ]);
    expect(g.shared).toEqual(["Preliminary"]);
    expect(ownWarnings(g.open[0], g.shared)).toEqual(["Natura"]);
  });
  it("keeps a single card's warnings on the card", () => {
    expect(groupCards([card("A", 1, ["Natura"])]).shared).toEqual([]);
    expect(groupCards([]).shared).toEqual([]);
  });
});

describe("mock matches mirror the engine", () => {
  it("ranks the beekeeper's parcels nearest first, blocked without a rank", () => {
    const cards = [...matches("B1", 2024, 9), ...matches("B3", 2024, 9)];
    const b1 = matches("B1", 2024, 9);
    const km = b1.map((c) => c.distance_km.value ?? 0);
    expect(km).toEqual([...km].sort((a, b) => a - b));
    expect(cards.some((c) => c.blocked)).toBe(true);
    const open = b1.filter((c) => !c.blocked);
    expect(open.map((c) => c.rank)).toEqual(open.map((_, i) => i + 1));
    for (const c of cards.filter((c) => c.blocked)) {
      expect(c.rank).toBeNull();
      expect(c.calculator_input).toBeNull();
    }
    expect(cards[0].warnings[0]).toBe(
      "Preliminary ranking by distance only (2024, week 9); bloom fit, nectar and spray calendars are not scored yet",
    );
  });
  it("returns nothing for an unknown beekeeper", () => {
    expect(matches("nobody", 2024, 1)).toEqual([]);
  });
});

describe("countText", () => {
  it("pluralises", () => {
    expect(countText(1)).toBe("1 possible placement");
    expect(countText(11)).toBe("11 possible placements");
  });
});
