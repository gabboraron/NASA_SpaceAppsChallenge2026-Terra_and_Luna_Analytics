// Season, crop and bloom-rule helpers shared by the map, the panels and the reading pages.
// Kept free of map libraries so the landing page does not pull them in.
import type { ParcelWeek, Season, Timeline } from "../api/client";

/** Demo seasons: 2022 (drought) and 2024. */
export const SEASONS = [2022, 2024] as const satisfies readonly Season[];
export const isSeason = (n: number): n is Season =>
  (SEASONS as readonly number[]).includes(n);

export const CROP_NAMES: Record<string, string> = {
  sunflower: "Sunflower",
  black_locust: "Black locust",
  apple: "Apple",
  sour_cherry: "Sour cherry",
  grassland: "Grassland",
};
/** Display name of a parcel's crop, falling back to the raw code. */
export const cropName = (crop: string): string => CROP_NAMES[crop] ?? crop;

/** Index a season once: week → parcel id → row, so a week change is a lookup. */
export function indexWeeks(
  timeline: Timeline | null,
): Map<number, Map<string, ParcelWeek>> {
  const index = new Map<number, Map<string, ParcelWeek>>();
  for (const row of timeline?.parcel_weeks ?? []) {
    const week = index.get(row.week) ?? new Map<string, ParcelWeek>();
    week.set(row.parcel_id, row);
    index.set(row.week, week);
  }
  return index;
}

export const WEEKS = 26;
const DAY_MS = 86_400_000;
const MONTH_LONG = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
});
const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});

/** First day of a timeline week; weeks run 1 to 26 from 1 March. */
export const weekStart = (year: Season, week: number): Date =>
  new Date(Date.UTC(year, 2, 1 + (week - 1) * 7));

/** e.g. "12 to 18 July", or "29 March to 4 April" across months. */
export function weekLabel(year: Season, week: number): string {
  const start = weekStart(year, week);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const [a, b] = [MONTH_LONG.format(start), MONTH_LONG.format(end)];
  return a === b
    ? `${start.getUTCDate()} to ${end.getUTCDate()} ${b}`
    : `${start.getUTCDate()} ${a} to ${end.getUTCDate()} ${b}`;
}

/** Month names placed at the week in which each month starts (March–August). */
export function monthTicks(year: Season): { label: string; week: number }[] {
  return [2, 3, 4, 5, 6, 7].map((m) => {
    const first = new Date(Date.UTC(year, m, 1));
    return {
      label: MONTH_SHORT.format(first),
      week: 1 + (first.getTime() - weekStart(year, 1).getTime()) / DAY_MS / 7,
    };
  });
}

/** The demo's headline state: in flower, but the soil is too dry for nectar. */
export const isHighBloomLowNectar = (row: ParcelWeek): boolean =>
  row.bloom_state === "blooming" && row.nectar_state === "low_nectar";
