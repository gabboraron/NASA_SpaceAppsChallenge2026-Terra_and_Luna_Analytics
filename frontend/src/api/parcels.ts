import type { components } from "./schema";
export type Parcel = components["schemas"]["Parcel"];
export const useMocks = import.meta.env.VITE_USE_MOCKS !== "false";
const fixtures: Parcel[] = [
  {
    id: "P1",
    grower_id: "G1",
    crop: "Sunflower",
    area_ha: 3,
    illustrative: true,
    service_type: "pollination",
    requested_colonies: 50,
    declared_bloom: null,
    natura_status: "clear",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [22.12, 47.83],
          [22.13, 47.83],
          [22.13, 47.84],
          [22.12, 47.83],
        ],
      ],
    },
  },
];
export async function getParcels(signal: AbortSignal): Promise<Parcel[]> {
  if (useMocks) return fixtures;
  const response = await fetch("/api/parcels", { signal });
  if (!response.ok)
    throw new Error("Parcel request failed (" + response.status + ").");
  return response.json();
}
