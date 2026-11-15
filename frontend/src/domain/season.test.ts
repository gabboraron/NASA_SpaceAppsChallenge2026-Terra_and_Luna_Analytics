import { describe, expect, it } from "vitest";
import type { ParcelWeek } from "../api/client";
import {
  HONEYS,
  MODELLED_CROPS,
  OWN_CROPS,
  bloomSpan,
  indexWeeks,
  latestSeason,
} from "./season";

describe("latestSeason", () => {
  it("is this year once the season's NASA data has settled", () => {
    expect(latestSeason(new Date("2026-09-14T12:00:00Z"))).toBe(2025);
    expect(latestSeason(new Date("2026-09-15T12:00:00Z"))).toBe(2026);
    expect(latestSeason(new Date("2027-02-01T12:00:00Z"))).toBe(2026);
  });
});

describe("honey filter helpers", () => {
  const row = (parcel_id: string, week: number, blooming: boolean) =>
    ({
      parcel_id,
      week,
      bloom_state: blooming ? "blooming" : "pre_bloom",
    }) as ParcelWeek;
  const weeks = indexWeeks(null, [
    row("A", 8, false),
    row("A", 9, true),
    row("A", 11, true),
    row("B", 20, true),
  ]);

  it("finds the first and last bloom week of the chosen parcels only", () => {
    expect(bloomSpan(weeks, new Set(["A"]))).toEqual([9, 11]);
    expect(bloomSpan(weeks, new Set(["A", "B"]))).toEqual([9, 20]);
  });
  it("is null when none of them blooms", () => {
    expect(bloomSpan(weeks, new Set(["C"]))).toBeNull();
    expect(bloomSpan(new Map(), new Set(["A"]))).toBeNull();
  });
  it("offers each crop under one honey, and only crops an own parcel can have", () => {
    const crops = HONEYS.flatMap((h) => h.crops);
    expect(new Set(crops).size).toBe(crops.length);
    expect(OWN_CROPS.every((c) => crops.includes(c))).toBe(true);
    expect([...MODELLED_CROPS].every((c) => OWN_CROPS.includes(c))).toBe(true);
  });
});
