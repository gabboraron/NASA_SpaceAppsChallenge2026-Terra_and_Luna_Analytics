// Offline fixtures for VITE_USE_MOCKS (the default). Shapes follow the API contract.
import type {
  Actors,
  Measurement,
  Natura,
  Parcel,
  ParcelWeek,
  Polygon,
  Provenance,
  Season,
  Timeline,
} from "./client";
import { WEEKS, weekStart } from "../components/MapCanvas/layers";

const square = (lon: number, lat: number, d: number): Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [lon, lat],
      [lon + d, lat],
      [lon + d, lat + d],
      [lon, lat + d],
      [lon, lat],
    ],
  ],
});

const parcel = (
  id: string,
  crop: string,
  lon: number,
  lat: number,
  extra: Partial<Parcel> = {},
): Parcel => ({
  id,
  grower_id: "G1",
  crop,
  area_ha: 3,
  illustrative: true,
  service_type: "pollination",
  requested_colonies: 50,
  declared_bloom: null,
  irrigated: false,
  natura_status: "clear",
  geometry: square(lon, lat, 0.01),
  ...extra,
});

export const parcels: Parcel[] = [
  parcel("P1", "sunflower", 22.12, 47.83, { grower_id: "G3", area_ha: 12.4 }),
  parcel("P2", "apple", 21.95, 47.9, {
    area_ha: 2.3,
    requested_colonies: 20,
    irrigated: true,
    natura_status: "buffer_overlap",
    declared_bloom: { start: "2024-04-22", end: "2024-05-08" },
  }),
  parcel("P3", "black_locust", 21.82, 47.96, {
    grower_id: "G4",
    service_type: "forage",
    requested_colonies: null,
    natura_status: "inside",
  }),
];

export const natura: Natura = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: square(21.8, 47.95, 0.05),
      properties: { site_name: "Example protected area" },
    },
  ],
};

export const actors: Actors = {
  growers: [
    { id: "G1", name: "Synthetic grower G1 (orchard)", synthetic: true },
    { id: "G3", name: "Synthetic grower G3 (sunflower)", synthetic: true },
    { id: "G4", name: "Synthetic host G4 (forage)", synthetic: true },
  ],
  beekeepers: [
    {
      id: "B1",
      name: "Example beekeeper",
      synthetic: true,
      home: [22.1, 47.82],
      colonies: 50,
      max_distance_km: 40,
      goal: "pollination",
      availability: { start: "2024-03-01", end: "2024-08-31" },
    },
  ],
};

const MOCK = "Mock data, not a NASA query";
type Kind = Provenance["kind"];
const prov = (kind: Kind, note = "", interpolated = false): Provenance => ({
  kind,
  source: MOCK,
  observed_at: null,
  interpolated,
  note,
});
const value = (v: number | null, p: Provenance): Measurement => ({
  value: v,
  provenance: v === null ? prov("Missing", "No observation") : p,
});

const verified = new Set<string>();
const PHOTO: Provenance = {
  kind: "Observed",
  source: "Grower field photo (simulated)",
  observed_at: new Date().toISOString().slice(0, 10),
  interpolated: false,
  note: "Simulated in the demo; resets when the page reloads.",
};

/** Mirrors POST /parcels/{id}/verify: later timelines mark blooming weeks Observed. */
export function verify(id: string): Provenance {
  verified.add(id);
  return PHOTO;
}

const BLOOM: Record<string, [number, number]> = {
  sunflower: [18, 22],
  apple: [8, 10],
  black_locust: [11, 12],
};

function week(p: Parcel, w: number, year: Season): ParcelWeek {
  const start = weekStart(year, w);
  const sunflower = p.crop === "sunflower";
  const [from, to] = BLOOM[p.crop] ?? [99, 99];
  const bloom = w < from ? "pre_bloom" : w <= to ? "blooming" : "post_bloom";
  const low = sunflower && bloom === "blooming" && year === 2022;
  // Sunflower: HLS every other week, gap weeks interpolated (as the engine does).
  const gapWeek = sunflower && w % 2 === 1;
  // Latest scene: this week, or the week before for a gap-filled week.
  const scene = new Date(start.getTime() - (gapWeek ? 7 : 0) * 86_400_000);
  const hls: Provenance = {
    ...prov("Estimated", gapWeek ? "Linear between scenes" : "", gapWeek),
    observed_at: scene.toISOString().slice(0, 10),
  };
  const ndyi = sunflower ? Math.max(0, 0.32 - Math.abs(w - 20) * 0.06) : null;
  const bloomProv =
    verified.has(p.id) && bloom === "blooming"
      ? PHOTO
      : sunflower
        ? hls
        : prov("Reported", "Grower-declared window");
  return {
    parcel_id: p.id,
    week: w,
    starts_on: start.toISOString().slice(0, 10),
    bloom_state: bloom,
    bloom_provenance: bloomProv,
    nectar_state: low ? "low_nectar" : sunflower ? "normal" : "unknown",
    nectar_provenance: prov(
      sunflower ? "Estimated" : "Missing",
      low
        ? "Heuristic: SMAP below the 20th percentile"
        : sunflower
          ? "Heuristic"
          : "Not drought-sensitive in the model",
    ),
    estimated_bloom: sunflower
      ? { start: `${year}-07-05`, end: `${year}-08-08` }
      : null,
    ndvi: value(sunflower ? 0.4 + w * 0.015 : null, hls),
    ndyi: value(ndyi, hls),
    gdd: value(Math.max(0, (w - 4) * 55), prov("Estimated", "Base 6 °C")),
    smap_cell_id: sunflower ? "C1" : null,
  };
}

export function timeline(year: Season): Timeline {
  const weeks = Array.from({ length: WEEKS }, (_, i) => i + 1);
  return {
    year,
    parcel_weeks: parcels.flatMap((p) => weeks.map((w) => week(p, w, year))),
    smap_cells: weeks.map((w) => ({
      cell_id: "C1",
      week: w,
      geometry: square(22.05, 47.78, 0.1),
      root_zone_moisture: { value: 0.2, provenance: prov("Observed") },
      percentile: {
        value: year === 2022 ? 9 : 52,
        provenance: prov("Observed"),
      },
    })),
  };
}
