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
export type Provenance = Schemas["Provenance"];
export type Measurement = Schemas["Measurement"];
export type Grower = Schemas["Grower"];
export type SoilMoistureWeek = Schemas["SoilMoistureWeek"];
export type MatchCard = Schemas["MatchCard"];
export type CalculatorInput = Schemas["CalculatorInput"];
export type CalculatorResult = Schemas["CalculatorResult"];

export const useMocks = import.meta.env.VITE_USE_MOCKS !== "false";

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api" + path, init);
  if (!response.ok)
    throw new Error(`Request ${path} failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export const getParcels = (signal: AbortSignal) =>
  useMocks
    ? Promise.resolve(mocks.parcels)
    : get<Parcel[]>("/parcels", { signal });

export const getNatura = (signal: AbortSignal) =>
  useMocks
    ? Promise.resolve(mocks.natura)
    : get<Natura>("/natura2000", { signal });

export const getActors = (signal: AbortSignal) =>
  useMocks ? Promise.resolve(mocks.actors) : get<Actors>("/actors", { signal });

export const getTimeline = (year: Season, signal?: AbortSignal) =>
  useMocks
    ? Promise.resolve(mocks.timeline(year))
    : get<Timeline>(`/timeline?year=${year}`, { signal });

/** Simulated grower field photo (D16): the parcel's blooming weeks become Observed. */
export const verifyParcel = (id: string) =>
  useMocks
    ? Promise.resolve(mocks.verify(id))
    : get<Provenance>(`/parcels/${encodeURIComponent(id)}/verify`, {
        method: "POST",
      });

export const getMatches = (
  beekeeperId: string,
  year: Season,
  week: number,
  signal: AbortSignal,
) =>
  useMocks
    ? Promise.resolve(mocks.matches(beekeeperId))
    : get<MatchCard[]>(
        `/matches?${new URLSearchParams({ beekeeper_id: beekeeperId, year: String(year), week: String(week) })}`,
        { signal },
      );

/** Low / base / high economics of a move (contribution, benefit vs the alternative). */
export const calculate = (input: CalculatorInput, signal: AbortSignal) =>
  useMocks
    ? Promise.resolve(mocks.calculate(input))
    : get<CalculatorResult>("/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal,
      });
