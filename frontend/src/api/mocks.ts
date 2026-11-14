// Offline fixtures for VITE_USE_MOCKS (the default). Shapes follow the API contract.
import type {
  Actors,
  Natura,
  Parcel,
  ParcelWeek,
  Polygon,
  Season,
  Timeline,
} from "./client";

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
});

export const parcels: Parcel[] = [
  parcel("P1", "sunflower", 22.12, 47.83),
  parcel("P2", "apple", 21.95, 47.9),
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
  growers: [{ id: "G1", name: "Example grower", synthetic: true }],
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
type Kind = ParcelWeek["bloom_provenance"]["kind"];
const prov = (kind: Kind, note = "") => ({
  kind,
  source: MOCK,
  observed_at: null,
  interpolated: false,
  note,
});

function week(p: Parcel, w: number, year: Season): ParcelWeek {
  const start = new Date(Date.UTC(year, 2, 1 + (w - 1) * 7));
  const sunflower = p.crop === "sunflower";
  const bloom = sunflower
    ? w < 18
      ? "pre_bloom"
      : w <= 22
        ? "blooming"
        : "post_bloom"
    : w < 8
      ? "pre_bloom"
      : w <= 10
        ? "blooming"
        : "post_bloom";
  const low = sunflower && bloom === "blooming" && year === 2022;
  const gap = { value: null, provenance: prov("Missing") };
  return {
    parcel_id: p.id,
    week: w,
    starts_on: start.toISOString().slice(0, 10),
    bloom_state: bloom,
    bloom_provenance: prov("Estimated"),
    nectar_state: low ? "low_nectar" : "normal",
    nectar_provenance: prov(
      "Estimated",
      low ? "Heuristic: SMAP below the 20th percentile" : "",
    ),
    estimated_bloom: null,
    ndvi: gap,
    ndyi: gap,
    gdd: gap,
    smap_cell_id: sunflower ? "C1" : null,
  };
}

export function timeline(year: Season): Timeline {
  const weeks = Array.from({ length: 26 }, (_, i) => i + 1);
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
