import { describe, expect, it } from "vitest";
import { latestSeason } from "./season";

describe("latestSeason", () => {
  it("is this year once the season's NASA data has settled", () => {
    expect(latestSeason(new Date("2026-09-14T12:00:00Z"))).toBe(2025);
    expect(latestSeason(new Date("2026-09-15T12:00:00Z"))).toBe(2026);
    expect(latestSeason(new Date("2027-02-01T12:00:00Z"))).toBe(2026);
  });
});
