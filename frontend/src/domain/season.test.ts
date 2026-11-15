import { describe, expect, it } from "vitest";
import type { ParcelWeek } from "../api/client";
import {
  HONEYS,
  MODELLED_CROPS,
  OWN_CROPS,
  bloomSpan,
  formatDay,
  indexWeeks,
  latestSeason,
  windowInYear,
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

describe("date helpers", () => {
  it("moves a window to another season by calendar date, as weeks.py does", () => {
    expect(
      windowInYear({ start: "2024-04-22", end: "2024-05-08" }, 2022),
    ).toEqual({ start: "2022-04-22", end: "2022-05-08" });
    expect(
      windowInYear({ start: "2024-02-29", end: "2024-03-02" }, 2023),
    ).toEqual({ start: "2023-02-28", end: "2023-03-02" });
    expect(
      windowInYear({ start: "2024-02-29", end: "2024-03-02" }, 2028).start,
    ).toBe("2028-02-29");
  });
  it("formats a day in UTC, and leaves text that is not a date", () => {
    expect(formatDay("2024-07-12")).toBe("12 Jul 2024");
    expect(formatDay("soon")).toBe("soon");
  });
});
