import { describe, expect, it } from "vitest";
import { stayBar } from "./Placements";

describe("stayBar", () => {
  it("places a stay on the March–August bar by month and day", () => {
    const whole = stayBar("2024-03-01", "2024-08-31")!;
    expect(whole.left).toBeCloseTo(0);
    expect(whole.width).toBeCloseTo(100);
    const may = stayBar("2022-05-01", "2022-05-31")!;
    expect(may.left).toBeCloseTo((61 / 184) * 100);
    expect(may.width).toBeCloseTo((31 / 184) * 100);
  });
  it("clips stays that run outside the season", () => {
    const early = stayBar("2024-02-10", "2024-03-10")!;
    expect(early.left).toBe(0);
    expect(early.width).toBeCloseTo((10 / 184) * 100);
  });
  it("is null for bad dates, reversed stays and stays outside the season", () => {
    expect(stayBar("soon", "2024-05-01")).toBeNull();
    expect(stayBar("2024-06-01", "2024-05-01")).toBeNull();
    expect(stayBar("2024-10-01", "2024-10-20")).toBeNull();
  });
});
