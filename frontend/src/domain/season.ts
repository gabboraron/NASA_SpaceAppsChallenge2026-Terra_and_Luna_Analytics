// Season, crop and bloom-rule helpers shared by the map, the panels and the reading pages.
// Kept free of map libraries so the landing page does not pull them in.
import type { ParcelWeek, Season, Timeline } from "../api/client";

/** Demo seasons: 2022 (drought) and 2024. */
export const SEASONS = [2022, 2024] as const satisfies readonly Season[];

export const DAY_MS = 86_400_000;

/**
 * Latest season whose NASA data is complete: this year from mid-September.
 * The same rule as `latest_season` in the API (`weeks.py`).
 */
export function latestSeason(today: Date): Season {
  const settled = new Date(today.getTime() - 14 * DAY_MS);
  // Months count from 0: September is 8.
  return settled.getUTCFullYear() - (settled.getUTCMonth() >= 8 ? 0 : 1);
}
/** The season the API reads live from NASA instead of the shipped cache. */
export const LIVE_SEASON = latestSeason(new Date());
/** Seasons of the map: the demo seasons and the live one. */
export const MAP_SEASONS: readonly Season[] = [
  ...new Set([...SEASONS, LIVE_SEASON]),
];
export const SEASON_LABELS: Record<Season, string> = {
  [LIVE_SEASON]: "Latest season, live from NASA",
  2022: "Drought year",
  2024: "Comparison year",
};
export const isSeason = (n: number): n is Season => MAP_SEASONS.includes(n);

export const CROP_NAMES: Record<string, string> = {
  sunflower: "Sunflower",
  black_locust: "Black locust",
  apple: "Apple",
  sour_cherry: "Sour cherry",
  grassland: "Grassland",
};
/** Display names of the two listing kinds. */
export const SERVICE = {
  pollination: "Pollination",
  forage: "Forage",
} as const;
/** Crops a beekeeper can give an own parcel; the first three have a heat-unit bloom model. */
export const OWN_CROPS: readonly string[] = [
  "black_locust",
  "apple",
  "sour_cherry",
  "sunflower",
  "grassland",
];
/** Own-parcel crops whose bloom is modelled from NASA POWER anywhere on Earth. */
export const MODELLED_CROPS: ReadonlySet<string> = new Set([
  "black_locust",
  "apple",
  "sour_cherry",
]);

/** Honey kinds by the bloom they come from, for filtering the map and matches. */
export const HONEYS: readonly { id: string; label: string; crops: string[] }[] =
  [
    { id: "acacia", label: "Acacia (black locust)", crops: ["black_locust"] },
    { id: "sunflower", label: "Sunflower", crops: ["sunflower"] },
    { id: "fruit", label: "Fruit blossom", crops: ["apple", "sour_cherry"] },
    { id: "meadow", label: "Meadow", crops: ["grassland"] },
  ];

/** First and last week in which any of the given parcels blooms, or null. */
export function bloomSpan(
  weeks: Map<number, Map<string, ParcelWeek>>,
  parcelIds: ReadonlySet<string>,
): [number, number] | null {
  const blooming = [...weeks.entries()]
    .filter(([, rows]) =>
      [...rows.values()].some(
        (r) => r.bloom_state === "blooming" && parcelIds.has(r.parcel_id),
      ),
    )
    .map(([week]) => week);
  return blooming.length
    ? [Math.min(...blooming), Math.max(...blooming)]
    : null;
}

/** Display name of a parcel's crop, falling back to the raw code. */
export const cropName = (crop: string): string => CROP_NAMES[crop] ?? crop;

/** Index a season once: week → parcel id → row, so a week change is a lookup. */
export function indexWeeks(
  timeline: Timeline | null,
  extra: ParcelWeek[] = [],
): Map<number, Map<string, ParcelWeek>> {
  const index = new Map<number, Map<string, ParcelWeek>>();
  for (const row of [...(timeline?.parcel_weeks ?? []), ...extra]) {
    const week = index.get(row.week) ?? new Map<string, ParcelWeek>();
    week.set(row.parcel_id, row);
    index.set(row.week, week);
  }
  return index;
}

export const WEEKS = 26;
const MONTH_LONG = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
});
const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
/** "12 Jul 2024" from an ISO date; the text itself when it is not a date. */
export function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : DAY.format(date);
}

/**
 * A window moved to `year` by calendar date, 29 Feb becoming 28 Feb: the same
 * rule as `window_in_year` in the API (`weeks.py`).
 */
export function windowInYear(
  w: { start: string; end: string },
  year: Season,
): { start: string; end: string } {
  const move = (iso: string) => {
    const [, m, d] = iso.split("-").map(Number);
    const leap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
    const day = m === 2 && d === 29 && !leap ? 28 : d;
    return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  return { start: move(w.start), end: move(w.end) };
}

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
