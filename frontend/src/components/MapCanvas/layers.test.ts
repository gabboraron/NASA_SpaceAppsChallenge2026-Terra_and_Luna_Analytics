import { describe, expect, it } from "vitest";
import { parcels, timeline } from "../../api/mocks";
import {
  centroid,
  foragingRings,
  hatch,
  indexWeeks,
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
    expect([...w.keys()].sort()).toEqual(["P1", "P2"]);
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
    ]);
  });
  it("get one dot each at the centroid for low zoom", () => {
    const dots = parcelDots(parcels);
    expect(dots.features).toHaveLength(2);
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
