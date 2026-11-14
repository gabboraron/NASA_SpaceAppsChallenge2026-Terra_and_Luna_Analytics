// Pure data and style helpers for the map layers (no MapLibre instance needed).
import circle from "@turf/circle";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import type {
  Beekeeper,
  Parcel,
  ParcelWeek,
  Season,
  Timeline,
} from "../../api/client";

export type LayerId =
  "parcels" | "natura" | "smap" | "buffers" | "beekeepers" | "imagery";

export const BLOOM_COLORS = {
  none: "#e7ebe2",
  pre_bloom: "#f6e7b0",
  blooming: "#ebbc43",
  post_bloom: "#b9a27a",
  missing: "#ffffff",
} as const;

export const CROP_COLORS: Record<string, string> = {
  sunflower: "#9a5b00",
  black_locust: "#2f5d8a",
  apple: "#b2456a",
  sour_cherry: "#6d1d38",
};
export const OTHER_CROP = "#6b7068";
export const CROP_NAMES: Record<string, string> = {
  sunflower: "Sunflower",
  black_locust: "Black locust",
  apple: "Apple",
  sour_cherry: "Sour cherry",
  grassland: "Grassland",
};
export const DROUGHT = "#ae4036";
export const NATURA = "#315e48";
export const INK = "#192b24";

export const BLOOM_LABELS: Record<ParcelWeek["bloom_state"], string> = {
  none: "Not in bloom",
  pre_bloom: "Before bloom",
  blooming: "Blooming",
  post_bloom: "After bloom",
};
export const NECTAR_LABELS: Record<ParcelWeek["nectar_state"], string> = {
  normal: "Nectar normal",
  low_nectar: "Low nectar",
  unknown: "Nectar unknown",
};

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

/** Weeks run 1–26 from 1 March; returns e.g. "12–18 July". */
export function weekLabel(year: Season, week: number): string {
  const start = new Date(Date.UTC(year, 2, 1 + (week - 1) * 7));
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const month = (d: Date) =>
    d.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  return month(start) === month(end)
    ? `${start.getUTCDate()}–${end.getUTCDate()} ${month(end)}`
    : `${start.getUTCDate()} ${month(start)} – ${end.getUTCDate()} ${month(end)}`;
}

export function parcelCollection(
  parcels: Parcel[],
): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: parcels.map((p) => ({
      type: "Feature",
      geometry: p.geometry as Polygon,
      properties: { id: p.id, crop: p.crop },
    })),
  };
}

/** One point per parcel, for the low-zoom dot layer. */
export function parcelDots(parcels: Parcel[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: parcels.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: centroid(p.geometry) },
      properties: { id: p.id, crop: p.crop },
    })),
  };
}

export function beekeeperCollection(
  beekeepers: Beekeeper[],
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: beekeepers.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: b.home },
      properties: {
        id: b.id,
        label: b.synthetic ? `${b.id} · synthetic` : b.id,
      },
    })),
  };
}

/** Red tint for dry cells: 0.4 at the 0th percentile, none from the 50th. */
export function smapOpacity(percentile: number): number {
  return Math.max(0, Math.min(0.4, (0.4 * (50 - percentile)) / 50));
}

/** SMAP cells for one week; cells without a percentile are left out. */
export function smapCollection(
  timeline: Timeline | null,
  week: number,
): FeatureCollection<Polygon> {
  const cells = timeline?.smap_cells ?? [];
  return {
    type: "FeatureCollection",
    features: cells
      .filter((c) => c.week === week && c.percentile.value !== null)
      .map((c) => ({
        type: "Feature",
        geometry: c.geometry as Polygon,
        properties: {
          id: c.cell_id,
          percentile: c.percentile.value,
          opacity: smapOpacity(c.percentile.value ?? 50),
        },
      })),
  };
}

/** Vertex average of the outer ring (closing point skipped): close enough for small parcels. */
export function centroid(geometry: Parcel["geometry"]): [number, number] {
  const ring = geometry.coordinates[0].slice(0, -1);
  const sum = ring.reduce(
    (acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat],
    [0, 0],
  );
  return [sum[0] / ring.length, sum[1] / ring.length];
}

const RING_KM = [1, 2, 3] as const;

/** 1, 2 and 3 km foraging rings around each centre. */
export function foragingRings(
  centres: { center: [number, number]; kind: "beekeeper" | "parcel" }[],
): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = centres.flatMap(({ center, kind }) =>
    RING_KM.map((km) =>
      circle(center, km, {
        units: "kilometers",
        steps: 64,
        properties: { km, kind },
      }),
    ),
  );
  return { type: "FeatureCollection", features };
}

/** "#rrggbb" → [r, g, b, alpha] for image data. */
export function rgba(
  hex: string,
  alpha = 255,
): [number, number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255, alpha];
}

/** Diagonal stripe image for `fill-pattern` (RGBA, size × size). */
export function hatch(
  size: number,
  rgba: [number, number, number, number],
  width = 2,
): { width: number; height: number; data: Uint8Array } {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if ((x + y) % size < width) data.set(rgba, (y * size + x) * 4);
  return { width: size, height: size, data };
}
