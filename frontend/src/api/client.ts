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
export type PowerResponse = Schemas["PowerResponse"];
export type HlsResponse = Schemas["HlsResponse"];

// The real API is the default; `VITE_USE_MOCKS=true` runs the map offline on fixtures.
export const useMocks = import.meta.env.VITE_USE_MOCKS === "true";

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api" + path, init);
  if (!response.ok)
    throw new Error(`Request ${path} failed (${response.status}).`);
  return response.json() as Promise<T>;
}

// Static GETs are shared between pages for the whole session (landing → explorer),
// so callers' abort signals only stop their own state updates, not the request.
const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let hit = cache.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = load();
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
  }
  return hit;
}

export const getParcels = () =>
  cached("parcels", () =>
    useMocks ? Promise.resolve(mocks.parcels) : get<Parcel[]>("/parcels"),
  );

export const getNatura = () =>
  cached("natura", () =>
    useMocks ? Promise.resolve(mocks.natura) : get<Natura>("/natura2000"),
  );

export const getActors = () =>
  cached("actors", () =>
    useMocks ? Promise.resolve(mocks.actors) : get<Actors>("/actors"),
  );

export const getTimeline = (year: Season) =>
  cached(`timeline:${year}`, () =>
    useMocks
      ? Promise.resolve(mocks.timeline(year))
      : get<Timeline>(`/timeline?year=${year}`),
  );

/** Simulated grower field photo (D16): the parcel's blooming weeks become Observed. */
export const verifyParcel = async (id: string) => {
  const provenance = useMocks
    ? mocks.verify(id)
    : await get<Provenance>(`/parcels/${encodeURIComponent(id)}/verify`, {
        method: "POST",
      });
  // The server rewrote this parcel's weeks: drop both seasons' cached timelines.
  for (const key of [...cache.keys()])
    if (key.startsWith("timeline:")) cache.delete(key);
  return provenance;
};

export const getMatches = (
  beekeeperId: string,
  year: Season,
  week: number,
  signal: AbortSignal,
) =>
  useMocks
    ? Promise.resolve(mocks.matches(beekeeperId, year, week))
    : get<MatchCard[]>(
        `/matches?${new URLSearchParams({ beekeeper_id: beekeeperId, year: String(year), week: String(week) })}`,
        { signal },
      );

/** Low / base / high economics of a move (contribution, benefit vs the alternative). */
export const calculate = (input: CalculatorInput, signal: AbortSignal) =>
  useMocks
    ? Promise.resolve(mocks.calculate(input))
    : get<CalculatorResult>("/calculate", post(input, signal));

const post = (body: unknown, signal: AbortSignal): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
  signal,
});

/** Live POWER heat units, rain and flight weather under a drawn polygon. */
export const getPolygonPower = (
  polygon: Polygon,
  year: Season,
  signal: AbortSignal,
) =>
  useMocks
    ? Promise.resolve(mocks.polygonPower(year))
    : get<PowerResponse>(`/polygon/power?year=${year}`, post(polygon, signal));

/** Latest usable HLS scene of a drawn polygon; slow on a cold cache. */
export const getPolygonHls = (polygon: Polygon, signal: AbortSignal) =>
  useMocks
    ? Promise.resolve(mocks.polygonHls())
    : get<HlsResponse>("/polygon/hls", post(polygon, signal));
