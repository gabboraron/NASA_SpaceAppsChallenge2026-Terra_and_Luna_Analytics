import { useCallback, useEffect, useState } from "react";
import {
  getMyMatches,
  type MatchCard,
  type MatchRequest,
  type Season,
} from "../api/client";
import { useBackOnline } from "../api/connection";

/** Let a scrubbed slider settle before asking. */
const DEBOUNCE_MS = 250;

// Matches for a profile, season and week only change when a grower verifies a
// parcel, so replaying the season or switching back costs no request.
const cache = new Map<string, MatchCard[]>();
// Requests on their way, shared by every caller asking for the same key.
const inflight = new Map<string, Promise<MatchCard[]>>();
// Each beekeeper's latest cards per season, shown while another week loads.
const latest = new Map<string, MatchCard[]>();
// Bumped by `forgetMatches`, so hooks see a new key and fetch again.
let generation = 0;

const cacheKey = (profile: string, year: Season, week: number) =>
  `${generation}|${profile}|${year}|${week}`;

/** Drop cached matches: a verification changed the evidence they rank on. */
export function forgetMatches() {
  generation += 1;
  cache.clear();
  inflight.clear();
}

/**
 * POST /matches through the session cache, so every caller shares one answer.
 * The request is not cancelled when a caller leaves: its answer fills the cache.
 */
export function loadMatches(
  profile: MatchRequest,
  year: Season,
  week: number,
): Promise<MatchCard[]> {
  const id = JSON.stringify(profile);
  const key = cacheKey(id, year, week);
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  let request = inflight.get(key);
  if (!request) {
    request = getMyMatches(profile, year, week, new AbortController().signal)
      .then((cards) => {
        cache.set(key, cards);
        latest.set(`${id}|${year}`, cards);
        return cards;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, request);
  }
  return request;
}

export type Matches = {
  /** The selected beekeeper's cards; the last week's stay while a new week loads. */
  cards?: MatchCard[];
  pending: boolean;
  error: boolean;
  retry: () => void;
};

/**
 * The signed-in beekeeper's matches for a season and week, refetched when the
 * profile, season or week changes. Without a profile (no home parcel yet) there
 * is nothing to ask for.
 */
export function useMatches(
  profile: MatchRequest | null,
  year: Season,
  week: number,
): Matches {
  const id = profile ? JSON.stringify(profile) : "";
  const key = cacheKey(id, year, week);
  const cached = cache.get(key);
  const [attempt, setAttempt] = useState(0);
  // The key of the last response (to re-render) and whether it failed.
  const [done, setDone] = useState({ key: "", error: false });

  useEffect(() => {
    if (!profile || cache.has(key)) return;
    let stale = false;
    const timer = setTimeout(() => {
      loadMatches(profile, year, week)
        .then(() => !stale && setDone({ key, error: false }))
        .catch(() => !stale && setDone({ key, error: true }));
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // `key` holds the profile's content, season and week.
  }, [key, attempt]);

  const retry = useCallback(() => {
    setDone({ key: "", error: false });
    setAttempt((a) => a + 1);
  }, []);
  // A week that failed while the API was away loads once it is back.
  useBackOnline(retry);

  const error = !cached && done.key === key && done.error;
  return {
    cards: id ? (cached ?? latest.get(`${id}|${year}`)) : undefined,
    pending: !!id && !cached && !error,
    error,
    retry,
  };
}
