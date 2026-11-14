import { describe, expect, it } from "vitest";
import {
  parcels as mockParcels,
  timeline as mockTimeline,
} from "../../api/mocks";
import type { Parcel, ParcelWeek, Timeline } from "../../api/client";
import {
  buildCalendar,
  inFlower,
  monthAxis,
  type CalendarRow,
} from "./calendar";

const base = mockTimeline(2024).parcel_weeks[0];
const parcel = (id: string, crop: string): Parcel => ({
  ...mockParcels[0],
  id,
  crop,
});
const row = (
  parcel_id: string,
  week: number,
  bloom_state: ParcelWeek["bloom_state"],
  extra: Partial<ParcelWeek> = {},
): ParcelWeek => ({
  ...base,
  parcel_id,
  week,
  bloom_state,
  bloom_provenance: { ...base.bloom_provenance, kind: "Estimated" },
  nectar_state: "normal",
  ...extra,
});
const season = (rows: ParcelWeek[]): Timeline => ({
  year: 2024,
  parcel_weeks: rows,
  smap_cells: [],
});

describe("buildCalendar", () => {
  const two = [parcel("A", "apple"), parcel("B", "apple")];

  it("orders crops: sour cherry, apple, black locust, sunflower, then others", () => {
    const parcels = [
      "grassland",
      "sunflower",
      "apple",
      "black_locust",
      "sour_cherry",
    ].map((c, i) => parcel(`P${i}`, c));
    const rows = buildCalendar(season([]), parcels);
    expect(rows.map((r) => r.crop)).toEqual([
      "sour_cherry",
      "apple",
      "black_locust",
      "sunflower",
      "grassland",
    ]);
    expect(rows[3]).toMatchObject({ name: "Sunflower", signal: "HLS · NDYI" });
    expect(rows[0].signal).toBe("POWER · heat units");
    expect(rows[0].cells).toHaveLength(26);
  });

  it("labels each row with its most frequent bloom source", () => {
    const src = (source: string) => ({
      bloom_provenance: {
        ...base.bloom_provenance,
        kind: "Estimated" as const,
        source,
      },
    });
    const parcels = [
      parcel("A", "apple"),
      parcel("S", "sunflower"),
      parcel("G", "grassland"),
    ];
    const rows = buildCalendar(
      season([
        row("A", 1, "none", src("Grower declaration")),
        row("A", 2, "none", src("Grower declaration")),
        row("A", 3, "none", src("Heat-unit model: NASA POWER GDD")),
        row("S", 1, "none", src("NDYI from NASA HLS S30/L30 v2.0")),
        row("G", 1, "none", src("Field survey")),
      ]),
      parcels,
    );
    expect(rows.map((r) => r.signal)).toEqual([
      "Grower-declared",
      "HLS · NDYI",
      "Field survey",
    ]);
  });

  it("marks full bloom when at least half the parcels bloom", () => {
    const [r] = buildCalendar(
      season([row("A", 5, "blooming"), row("B", 5, "none")]),
      two,
    );
    expect(r.cells[4]).toBe("full");
  });

  it("marks edge for a minority blooming or pre/post bloom next to bloom", () => {
    const three = [...two, parcel("C", "apple")];
    const [r] = buildCalendar(
      season([
        row("A", 5, "blooming"),
        row("B", 5, "none"),
        row("C", 5, "none"),
        row("A", 6, "post_bloom"),
        row("B", 6, "none"),
        row("C", 6, "none"),
        row("A", 7, "none"),
        row("B", 7, "none"),
        row("C", 7, "none"),
      ]),
      three,
    );
    expect(r.cells.slice(4, 7)).toEqual(["edge", "edge", "none"]);
  });

  it("treats pre/post bloom away from any bloom week as no bloom", () => {
    const [r] = buildCalendar(
      season([
        row("A", 5, "blooming"),
        row("B", 5, "blooming"),
        row("A", 12, "post_bloom"),
        row("B", 12, "post_bloom"),
      ]),
      two,
    );
    expect(r.cells[11]).toBe("none");
  });

  it("lets a blooming low-nectar parcel override full bloom", () => {
    const [r] = buildCalendar(
      season([
        row("A", 9, "blooming", { nectar_state: "low_nectar" }),
        row("B", 9, "blooming"),
      ]),
      two,
    );
    expect(r.cells[8]).toBe("low");
  });

  it("ignores low nectar outside bloom", () => {
    const [r] = buildCalendar(
      season([
        row("A", 9, "none", { nectar_state: "low_nectar" }),
        row("B", 9, "none"),
      ]),
      two,
    );
    expect(r.cells[8]).toBe("none");
  });

  it("is missing only when every parcel's row is absent or Missing", () => {
    const missing = {
      bloom_provenance: { ...base.bloom_provenance, kind: "Missing" as const },
    };
    const [r] = buildCalendar(
      season([
        row("A", 1, "none", missing),
        row("A", 2, "none", missing),
        row("B", 2, "none"),
      ]),
      two,
    );
    expect(r.cells[0]).toBe("missing");
    expect(r.cells[1]).toBe("none");
    expect(r.cells[2]).toBe("missing");
  });

  it("builds every crop row from the mock season", () => {
    const rows = buildCalendar(mockTimeline(2024), mockParcels);
    expect(rows).toHaveLength(new Set(mockParcels.map((p) => p.crop)).size);
    expect(rows.flatMap((r) => r.cells)).toContain("full");
  });
});

describe("week text", () => {
  it("puts each month name on the week it mostly starts in", () => {
    const axis = monthAxis(2024);
    expect(axis).toHaveLength(26);
    expect(axis[0]).toBe("Mar");
    // 1 April 2024 falls in week 5 (29 March to 4 April).
    expect(axis[4]).toBe("Apr");
    expect(axis.filter(Boolean)).toEqual([
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
    ]);
  });

  it("lists crops in flower for the readout", () => {
    const rows: CalendarRow[] = [
      {
        crop: "apple",
        name: "Apple",
        signal: "",
        cells: Array(26).fill("edge"),
      },
      {
        crop: "sunflower",
        name: "Sunflower",
        signal: "",
        cells: Array(26).fill("none"),
      },
    ];
    expect(inFlower(rows, 3)).toBe("In flower: Apple (starting or ending).");
    expect(inFlower(rows.slice(1), 3)).toBe("Nothing in flower this week.");
  });
});
