import type { components } from "./schema";
import { checkApi } from "./connection";
import * as mocks from "./mocks";

type Schemas = components["schemas"];
export type Parcel = Schemas["Parcel"];
export type Natura = Schemas["NaturaCollection"];
export type Actors = Schemas["Actors"];
export type Beekeeper = Schemas["Beekeeper"];
/** A season year: one the shipped cache covers, or the latest one read live. */
export type Season = number;
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
export type HlsImagery = Schemas["HlsImagery"];
export type MatchRequest = Schemas["MatchRequest"];
export type OwnParcelRequest = Schemas["OwnParcelRequest"];
export type OwnParcelTimeline = Schemas["OwnParcelTimeline"];
export type CostDefaults = Schemas["CalculatorDefaults"];
export type CostSettings = Schemas["CostSettings"];
export type Window = Schemas["Window"];
export type ServiceType = Parcel["service_type"];

// The real API is the default; `VITE_USE_MOCKS=true` runs the map offline on fixtures.
export const useMocks = import.meta.env.VITE_USE_MOCKS === "true";

/** The API refused a request; `message` is its reason when it gave one. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** The API's reason for refusing (a FastAPI `detail` string), if any. */
async function reasonOf(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : undefined;
  } catch {
    return undefined;
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch("/api" + path, init);
    if (!response.ok)
      throw new ApiError(
        (await reasonOf(response)) ??
          `Request ${path} failed (${response.status}).`,
        response.status,
      );
    return (await response.json()) as T;
  } catch (error) {
    // A proxy answers 502/504 and a dead network throws: see whether the API is up.
    if (!init?.signal?.aborted) void checkApi();
    throw error;
  }
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
      : get<Timeline>(`/timeline?year=${year}`).then((timeline) => {
          // HLS and SMAP are still being fetched: the next call asks again.
          if (timeline.pending) cache.delete(`timeline:${year}`);
          return timeline;
        }),
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

/** The signed-in beekeeper's candidates: every listed parcel, from their own home. */
export const getMyMatches = (
  profile: MatchRequest,
  year: Season,
  week: number,
  signal: AbortSignal,
) =>
  useMocks
    ? Promise.resolve(mocks.myMatches(profile, year, week))
    : get<MatchCard[]>(
        `/matches?year=${year}&week=${week}`,
        post(profile, signal),
      );

/** Weekly bloom of a parcel the beekeeper drew, modelled where it lies. */
export const getOwnTimeline = (
  parcel: OwnParcelRequest,
  year: Season,
  signal: AbortSignal,
) =>
  useMocks
    ? Promise.resolve(mocks.ownTimeline(parcel, year))
    : get<OwnParcelTimeline>(
        `/polygon/timeline?year=${year}`,
        post(parcel, signal),
      );

/** The illustrative cost defaults a beekeeper's own costs replace. */
export const getCalculatorDefaults = () =>
  cached("calculator-defaults", () =>
    useMocks
      ? Promise.resolve(mocks.calculatorDefaults)
      : get<CostDefaults>("/calculator/defaults"),
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

/** Map tiles of a week's clearest HLS passes, or why there are none. */
export const getHlsImagery = (year: Season, week: number) =>
  cached(`imagery:${year}:${week}`, () =>
    useMocks
      ? Promise.resolve(mocks.hlsImagery())
      : get<HlsImagery>(`/imagery/hls?year=${year}&week=${week}`),
  );
