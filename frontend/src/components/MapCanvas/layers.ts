// Pure data and style helpers for the map layers (no MapLibre instance needed).
import circle from "@turf/circle";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import type { MatchCard, Parcel, ParcelWeek, Timeline } from "../../api/client";
import { WEEKS, isHighBloomLowNectar } from "../../domain/season";

export type LayerId =
  "parcels" | "natura" | "smap" | "buffers" | "beekeepers" | "imagery" | "hls";

// Season-atlas palette: beeswax neutral → pale honey → honey → spent wax.
export const BLOOM_COLORS = {
  none: "#ebe3cc",
  pre_bloom: "#f2dc94",
  blooming: "#e3a92b",
  post_bloom: "#bfa77a",
  missing: "#ffffff",
} as const;

export const CROP_COLORS: Record<string, string> = {
  sunflower: "#9a5b00",
  black_locust: "#2f5d8a",
  apple: "#b2456a",
  sour_cherry: "#6d1d38",
};
export const OTHER_CROP = "#6b7068";
export const DROUGHT = "#b03a2e";
export const NATURA = "#2f6b4f";
export const INK = "#1c1912";
export const HONEY = "#e3a92b";
export const PAPER = "#f7f0de";
/** The signed-in beekeeper's own parcels and home: same blue as --focus. */
export const OWN = "#1f5f8b";

export const BLOOM_LABELS: Record<ParcelWeek["bloom_state"], string> = {
  none: "Not in bloom",
  pre_bloom: "Before bloom",
  blooming: "Blooming",
  post_bloom: "After bloom",
};
const NECTAR_LABELS: Record<ParcelWeek["nectar_state"], string> = {
  normal: "Nectar normal",
  low_nectar: "Low nectar",
  unknown: "Nectar unknown",
};

/** True when the week's bloom or indices are gap-filled, not observed (D4). */
export const isInterpolated = (row: ParcelWeek): boolean =>
  row.bloom_provenance.interpolated ||
  row.ndvi.provenance.interpolated ||
  row.ndyi.provenance.interpolated;

/** One-line state of a parcel week, shared by the hover card and the detail panel. */
export function weekStateText(row?: ParcelWeek): string {
  if (!row) return "No data for this week";
  if (isHighBloomLowNectar(row)) return "High bloom / Low nectar";
  return `${BLOOM_LABELS[row.bloom_state]} · ${NECTAR_LABELS[row.nectar_state]}`;
}

/** Per week: how many parcels bloom, and how many of those are low on nectar. */
export function weekSummary(
  weeks: Map<number, Map<string, ParcelWeek>>,
  /** Count only these parcels (a honey filter); all when not given. */
  only?: ReadonlySet<string>,
): { blooming: number; low: number }[] {
  return Array.from({ length: WEEKS }, (_, i) => {
    const rows = [...(weeks.get(i + 1)?.values() ?? [])].filter(
      (r) => !only || only.has(r.parcel_id),
    );
    return {
      blooming: rows.filter((r) => r.bloom_state === "blooming").length,
      low: rows.filter(isHighBloomLowNectar).length,
    };
  });
}

/** How a parcel is marked on the map beyond its bloom and crop. */
export type ParcelMarks = {
  /** The signed-in beekeeper's own parcels: id → name. */
  own?: ReadonlyMap<string, string>;
  /** The parcels that give the chosen honey; the others are faded. */
  keep?: ReadonlySet<string>;
};

const marks = (p: Parcel, { own, keep }: ParcelMarks) => ({
  id: p.id,
  crop: p.crop,
  own: own?.has(p.id) ?? false,
  label: own?.get(p.id) ?? "",
  dim: keep ? !keep.has(p.id) : false,
});

export function parcelCollection(
  parcels: Parcel[],
  how: ParcelMarks = {},
): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: parcels.map((p) => ({
      type: "Feature",
      geometry: p.geometry as Polygon,
      properties: marks(p, how),
    })),
  };
}

/** One point per parcel, for the low-zoom dot layer and the own-parcel labels. */
export function parcelDots(
  parcels: Parcel[],
  how: ParcelMarks = {},
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: parcels.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: centroid(p.geometry) },
      properties: marks(p, how),
    })),
  };
}

/** The signed-in beekeeper's home apiary pin (none until a parcel is drawn). */
export function homePin(home?: [number, number]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: home
      ? [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: home },
            properties: { id: "home", label: "Your apiary" },
          },
        ]
      : [],
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

/** A drawn parcel may span at most this much (MAX_POLYGON_SPAN_DEG in contract.py). */
export const MAX_FIELD_SPAN_DEG = 0.1;

/** The larger of a polygon's longitude and latitude extent, in degrees. */
export function spanDeg(geometry: Parcel["geometry"]): number {
  const ring = geometry.coordinates[0];
  const lons = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  return Math.max(
    Math.max(...lons) - Math.min(...lons),
    Math.max(...lats) - Math.min(...lats),
  );
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

/** Rank badges at the centroids of ranked parcels (blocked ones get none). */
export function matchLabels(
  cards: MatchCard[],
  parcels: Parcel[],
): FeatureCollection<Point> {
  const byId = new Map(parcels.map((p) => [p.id, p]));
  return {
    type: "FeatureCollection",
    features: cards.flatMap((c) => {
      const parcel = byId.get(c.parcel_id);
      if (!parcel || c.rank === null) return [];
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: centroid(parcel.geometry),
          },
          properties: { id: c.parcel_id, label: String(c.rank) },
        },
      ];
    }),
  };
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
