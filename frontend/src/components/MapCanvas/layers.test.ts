import { describe, expect, it } from "vitest";
import { actors, matches, parcels, timeline, verify } from "../../api/mocks";
import type { MatchCard } from "../../api/client";
import {
  WEEKS,
  beekeeperCollection,
  centroid,
  foragingRings,
  hatch,
  indexWeeks,
  matchLabels,
  isHighBloomLowNectar,
  isInterpolated,
  monthTicks,
  weekSummary,
  rgba,
  parcelCollection,
  parcelDots,
  smapCollection,
  smapOpacity,
  weekLabel,
} from "./layers";

// Haversine distance in km, independent of turf.
function km([lon1, lat1]: number[], [lon2, lat2]: number[]): number {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) *
      Math.cos(lat2 * r) *
      Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
}

describe("weekLabel", () => {
  it("counts weeks from 1 March", () => {
    expect(weekLabel(2024, 1)).toBe("1–7 March");
    expect(weekLabel(2024, 20)).toBe("12–18 July");
  });
  it("names both months when a week spans two", () => {
    expect(weekLabel(2022, 5)).toBe("29 March – 4 April");
  });
});

describe("indexWeeks", () => {
  it("keys rows by week, then parcel", () => {
    const index = indexWeeks(timeline(2022));
    expect(index.size).toBe(26);
    const w = index.get(20)!;
    expect([...w.keys()].sort()).toEqual(["P1", "P2", "P3"]);
    expect(w.get("P1")).toMatchObject({
      bloom_state: "blooming",
      nectar_state: "low_nectar",
    });
    expect(indexWeeks(timeline(2024)).get(20)?.get("P1")?.nectar_state).toBe(
      "normal",
    );
  });
  it("is empty without a timeline", () => {
    expect(indexWeeks(null).size).toBe(0);
  });
});

describe("SMAP cells", () => {
  it("tints only drier-than-median cells, strongest at 0", () => {
    expect(smapOpacity(0)).toBeCloseTo(0.4);
    expect(smapOpacity(9)).toBeCloseTo(0.328);
    expect(smapOpacity(50)).toBe(0);
    expect(smapOpacity(90)).toBe(0);
  });
  it("keeps one week and drops cells without a percentile", () => {
    const t = timeline(2022);
    t.smap_cells[19].percentile.value = null;
    expect(smapCollection(t, 20).features).toHaveLength(0);
    const fc = smapCollection(timeline(2022), 20);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties).toMatchObject({
      id: "C1",
      percentile: 9,
    });
  });
});

describe("parcels", () => {
  it("carry id and crop for paint expressions", () => {
    const fc = parcelCollection(parcels);
    expect(fc.features.map((f) => f.properties)).toEqual([
      { id: "P1", crop: "sunflower" },
      { id: "P2", crop: "apple" },
      { id: "P3", crop: "black_locust" },
    ]);
  });
  it("get one dot each at the centroid for low zoom", () => {
    const dots = parcelDots(parcels);
    expect(dots.features).toHaveLength(parcels.length);
    expect(dots.features[0].properties).toEqual({
      id: "P1",
      crop: "sunflower",
    });
    expect(dots.features[0].geometry.coordinates[0]).toBeCloseTo(22.125);
  });
  it("centroid ignores the closing vertex", () => {
    const [lon, lat] = centroid(parcels[0].geometry);
    expect(lon).toBeCloseTo(22.125);
    expect(lat).toBeCloseTo(47.835);
  });
});

describe("foragingRings", () => {
  it("draws 1, 2 and 3 km rings per centre at the right distance", () => {
    const centre: [number, number] = [22.1, 47.82];
    const fc = foragingRings([
      { center: centre, kind: "beekeeper" },
      { center: [22.125, 47.835], kind: "parcel" },
    ]);
    expect(fc.features).toHaveLength(6);
    for (const f of fc.features.slice(0, 3)) {
      const radius = f.properties?.km as number;
      for (const p of f.geometry.coordinates[0])
        expect(km(centre, p)).toBeCloseTo(radius, 2);
    }
    expect(fc.features[3].properties).toEqual({ km: 1, kind: "parcel" });
  });
});

describe("rgba", () => {
  it("parses a hex colour", () => {
    expect(rgba("#ae4036")).toEqual([174, 64, 54, 255]);
    expect(rgba("#315e48", 150)).toEqual([49, 94, 72, 150]);
  });
});

describe("hatch", () => {
  it("paints a diagonal stripe of the given colour", () => {
    const img = hatch(4, [1, 2, 3, 255], 1);
    expect(img.data).toHaveLength(64);
    const px = (x: number, y: number) =>
      Array.from(img.data.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 4));
    expect(px(0, 0)).toEqual([1, 2, 3, 255]);
    expect(px(3, 1)).toEqual([1, 2, 3, 255]);
    expect(px(1, 0)).toEqual([0, 0, 0, 0]);
  });
});

describe("monthTicks", () => {
  it("puts each month at the fractional week it starts in", () => {
    const ticks = monthTicks(2024);
    expect(ticks.map((t) => t.label)).toEqual([
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
    ]);
    expect(ticks[0].week).toBe(1);
    expect(ticks[1].week).toBeCloseTo(1 + 31 / 7);
    expect(ticks.at(-1)!.week).toBeLessThanOrEqual(WEEKS);
  });
});

describe("week states", () => {
  const rows = (year: 2022 | 2024, week: number) =>
    timeline(year).parcel_weeks.filter((r) => r.week === week);

  it("flags 2022 July sunflower as high bloom / low nectar, not 2024", () => {
    const sunflower = (y: 2022 | 2024) =>
      rows(y, 20).find((r) => r.parcel_id === "P1")!;
    expect(isHighBloomLowNectar(sunflower(2022))).toBe(true);
    expect(isHighBloomLowNectar(sunflower(2024))).toBe(false);
  });

  it("marks gap-filled weeks as interpolated", () => {
    const p1 = (w: number) => rows(2024, w).find((r) => r.parcel_id === "P1")!;
    expect(isInterpolated(p1(19))).toBe(true);
    expect(isInterpolated(p1(20))).toBe(false);
  });

  it("summarises bloom and low nectar per week for the slider strip", () => {
    const summary = weekSummary(indexWeeks(timeline(2022)));
    expect(summary).toHaveLength(WEEKS);
    expect(summary[19]).toEqual({ blooming: 1, low: 1 });
    expect(summary[0]).toEqual({ blooming: 0, low: 0 });
    expect(weekSummary(new Map())[5]).toEqual({ blooming: 0, low: 0 });
  });
});

describe("mock verification", () => {
  it("turns only the parcel's blooming weeks Observed", () => {
    expect(verify("P1").kind).toBe("Observed");
    const p1 = timeline(2024).parcel_weeks.filter((r) => r.parcel_id === "P1");
    for (const r of p1)
      expect(r.bloom_provenance.kind === "Observed").toBe(
        r.bloom_state === "blooming",
      );
  });
});

describe("beekeeper layers", () => {
  const b1 = actors.beekeepers[0];
  it("marks only the selected beekeeper's pin", () => {
    const fc = beekeeperCollection(actors.beekeepers, b1.id);
    expect(fc.features.map((f) => f.properties?.selected)).toEqual(
      actors.beekeepers.map((b) => b.id === b1.id),
    );
  });
});

describe("matchLabels", () => {
  it("puts a rank badge on each ranked parcel, none on blocked ones", () => {
    const cards = [...matches("B1", 2024, 9), ...matches("B3", 2024, 9)];
    const fc = matchLabels(cards, parcels);
    const ranked = cards.filter((c) => c.rank !== null);
    expect(fc.features.map((f) => f.properties?.id)).toEqual(
      ranked.map((c) => c.parcel_id),
    );
    expect(fc.features[0].properties?.label).toBe("1");
  });
  it("skips cards for parcels it does not know", () => {
    expect(
      matchLabels(
        [{ ...matches("B1", 2024, 9)[0], parcel_id: "nope" } as MatchCard],
        parcels,
      ).features,
    ).toEqual([]);
  });
});
