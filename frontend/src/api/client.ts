import type { components } from "./schema";
import * as mocks from "./mocks";

type Schemas = components["schemas"];
export type Parcel = Schemas["Parcel"];
export type Natura = Schemas["NaturaCollection"];
export type Actors = Schemas["Actors"];
export type Beekeeper = Schemas["Beekeeper"];
export type Season = Schemas["Season"];
export type Timeline = Schemas["TimelineResponse"];
export type ParcelWeek = Schemas["ParcelWeek"];
export type Polygon = Schemas["Polygon"];

export const useMocks = import.meta.env.VITE_USE_MOCKS !== "false";

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch("/api" + path, { signal });
  if (!response.ok)
    throw new Error(`Request ${path} failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export const getParcels = (signal: AbortSignal) =>
  useMocks ? Promise.resolve(mocks.parcels) : get<Parcel[]>("/parcels", signal);

export const getNatura = (signal: AbortSignal) =>
  useMocks ? Promise.resolve(mocks.natura) : get<Natura>("/natura2000", signal);

export const getActors = (signal: AbortSignal) =>
  useMocks ? Promise.resolve(mocks.actors) : get<Actors>("/actors", signal);

export const getTimeline = (year: Season, signal: AbortSignal) =>
  useMocks
    ? Promise.resolve(mocks.timeline(year))
    : get<Timeline>(`/timeline?year=${year}`, signal);
