import { describe, expect, it } from "vitest";
import type { MatchRequest } from "./client";
import { calculate, myMatches, ownTimeline, parcels } from "./mocks";

const profile: MatchRequest = {
  home: [22.0, 47.85],
  colonies: 50,
  max_distance_km: 60,
  availability: { start: "2024-04-01", end: "2024-08-31" },
  vehicle_l_per_100km: 10,
  alternative_contribution_eur: 100,
  costs: {},
};

describe("offline mocks of the signed-in beekeeper routes", () => {
  it("match every listed parcel, of both service types, from the profile's home", () => {
    const cards = myMatches(profile, 2024, 9);
    expect(cards.map((c) => c.parcel_id).sort()).toEqual(
      parcels.map((p) => p.id).sort(),
    );
    expect(new Set(cards.map((c) => c.beekeeper_id))).toEqual(new Set(["you"]));
    const far = myMatches({ ...profile, home: [19, 47] }, 2024, 9);
    expect(far[0].distance_km.value!).toBeGreaterThan(
      cards[0].distance_km.value! + 100,
    );
  });
  it("prefill the calculator with the beekeeper's own costs, marked Reported", () => {
    const plain = myMatches(profile, 2024, 9)[0].calculator_input!;
    const mine = myMatches(
      { ...profile, costs: { fuel_price_per_l: 2.2, legs: 2 } },
      2024,
      9,
    )[0].calculator_input!;
    expect(mine.fuel_price_per_l).toBe(2.2);
    expect(mine.driving_hours).toBeCloseTo(plain.driving_hours / 2);
    expect(mine.provenance!.fuel_price_per_l.kind).toBe("Reported");
    expect(plain.provenance!.fuel_price_per_l.kind).toBe("Estimated");
    expect(mine.fuel_l_per_100km).toBe(10);
    expect(calculate(mine).base.transport_cost).toBeLessThan(
      calculate({ ...mine, legs: 4, driving_hours: plain.driving_hours }).base
        .transport_cost,
    );
  });
  it("give an own parcel 26 weeks under its own id and geometry", () => {
    const geometry = parcels[0].geometry;
    const answer = ownTimeline(
      { id: "own-1", crop: "black_locust", geometry, irrigated: false },
      2024,
    );
    expect(answer.parcel).toMatchObject({
      id: "own-1",
      illustrative: false,
      geometry,
    });
    expect(answer.weeks).toHaveLength(26);
    expect(new Set(answer.weeks.map((w) => w.parcel_id))).toEqual(
      new Set(["own-1"]),
    );
    expect(answer.weeks.some((w) => w.bloom_state === "blooming")).toBe(true);
  });
});
