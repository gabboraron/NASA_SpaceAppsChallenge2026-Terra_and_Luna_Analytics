// Pure helpers for the landing page's honeycomb calendar (Fig. 1).
import type { Parcel, ParcelWeek, Season, Timeline } from "../../api/client";
import {
  WEEKS,
  cropName,
  indexWeeks,
  isHighBloomLowNectar,
  monthTicks,
} from "../../domain/season";

/** One crop-week of the calendar. */
export type CellState = "none" | "edge" | "full" | "low" | "missing";

export type CalendarRow = {
  crop: string;
  name: string;
  /** The signal the bloom estimate comes from. */
  signal: string;
  /** Index 0 is week 1. */
  cells: CellState[];
};

export const STATE_WORDS: Record<CellState, string> = {
  none: "no bloom",
  edge: "starting or ending",
  full: "full bloom",
  low: "bloom, low nectar",
  missing: "no data",
};

const CROP_ORDER = ["sour_cherry", "apple", "black_locust", "sunflower"];

/** Short names for the engine's provenance sources; anything else is shown as is. */
const SHORT_SOURCES: [RegExp, string][] = [
  [/HLS/, "HLS · NDYI"],
  [/POWER/, "POWER · heat units"],
  [/Grower declaration/, "Grower-declared"],
  [/^Mock data/, "Mock data"],
];

/** Fallback when a crop has no usable rows in the season. */
const defaultSignal = (crop: string): string =>
  crop === "sunflower" ? "HLS · NDYI" : "POWER · heat units";

/** The crop's most frequent bloom source, shortened for the row label. */
function signalOf(crop: string, rows: ParcelWeek[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const s = r.bloom_provenance.source;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let top = "";
  for (const [s, n] of counts) if (n > (counts.get(top) ?? 0)) top = s;
  if (!top) return defaultSignal(crop);
  return SHORT_SOURCES.find(([re]) => re.test(top))?.[1] ?? top;
}

/**
 * Collapse parcel weeks into one state per crop and week.
 *
 * Low nectar wins (any parcel blooming on a low-nectar flag, as on the map),
 * then full bloom (at least half the crop's parcels blooming), then edge
 * (some blooming, or before/after bloom in a week next to a blooming week). A week is missing only when
 * every parcel of the crop has no row or a Missing bloom provenance.
 */
export function buildCalendar(
  timeline: Timeline,
  parcels: Parcel[],
): CalendarRow[] {
  const byCrop = new Map<string, string[]>();
  for (const p of parcels) {
    const ids = byCrop.get(p.crop);
    if (ids) ids.push(p.id);
    else byCrop.set(p.crop, [p.id]);
  }
  const rank = (crop: string) => {
    const i = CROP_ORDER.indexOf(crop);
    return i === -1 ? CROP_ORDER.length : i;
  };
  const crops = [...byCrop.keys()].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b),
  );
  const weeks = indexWeeks(timeline);
  return crops.map((crop) => {
    const ids = byCrop.get(crop) ?? [];
    const usable: ParcelWeek[] = [];
    const weekRows = Array.from({ length: WEEKS }, (_, i) => {
      const week = weeks.get(i + 1);
      const rows = ids
        .map((id) => week?.get(id))
        .filter(
          (r): r is ParcelWeek =>
            r !== undefined && r.bloom_provenance.kind !== "Missing",
        );
      usable.push(...rows);
      return rows;
    });
    const blooming = weekRows.map(
      (rows) => rows.filter((r) => r.bloom_state === "blooming").length,
    );
    const cells = weekRows.map((rows, i): CellState => {
      if (rows.length === 0) return "missing";
      if (rows.some(isHighBloomLowNectar)) return "low";
      if (blooming[i] * 2 >= ids.length) return "full";
      if (blooming[i] > 0) return "edge";
      // Before/after bloom lasts all season for orchards; show only the week next to bloom.
      const nearBloom =
        (blooming[i - 1] ?? 0) > 0 || (blooming[i + 1] ?? 0) > 0;
      if (nearBloom && rows.some((r) => r.bloom_state !== "none"))
        return "edge";
      return "none";
    });
    return {
      crop,
      name: cropName(crop),
      signal: signalOf(crop, usable),
      cells,
    };
  });
}

/** Axis label per week: the month name in the week a month starts, else "". */
export function monthAxis(year: Season): string[] {
  const axis: string[] = Array(WEEKS).fill("");
  for (const t of monthTicks(year)) axis[Math.round(t.week) - 1] = t.label;
  return axis;
}

/** Readout sentence for the selected week. */
export function inFlower(rows: CalendarRow[], week: number): string {
  const now = rows
    .filter((r) => ["edge", "full", "low"].includes(r.cells[week - 1]))
    .map((r) => `${r.name} (${STATE_WORDS[r.cells[week - 1]]})`);
  return now.length
    ? `In flower: ${now.join(", ")}.`
    : "Nothing in flower this week.";
}
