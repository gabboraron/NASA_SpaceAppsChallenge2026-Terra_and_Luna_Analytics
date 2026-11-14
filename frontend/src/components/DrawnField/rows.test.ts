import { describe, expect, it } from "vitest";
import { polygonHls, polygonPower } from "../../api/mocks";
import { hlsRows, powerRows } from "./rows";

describe("drawn field rows", () => {
  it("shows the last heat sum and a signed rain anomaly", () => {
    const texts = powerRows(polygonPower(2022)).map((r) => r.text);
    expect(texts).toEqual(["1840 GDD", "182 mm", "-96 mm", "142 days"]);
    expect(powerRows(polygonPower(2024))[2].text).toBe("+23 mm");
  });

  it("shows a dash and keeps the reason for a missing value", () => {
    const power = polygonPower(2024);
    const [heat] = powerRows({ ...power, gdd_series: [] });
    expect(heat.text).toBe("—");
    const [ndvi] = hlsRows(polygonHls());
    expect(ndvi.text).toBe("—");
    expect(ndvi.m.provenance.kind).toBe("Missing");
  });
});
