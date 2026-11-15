import { useCallback, useEffect, useState } from "react";
import { getMatches, type MatchCard, type Season } from "../api/client";
import { useBackOnline } from "../api/connection";

/** Let a scrubbed slider settle before asking. */
const DEBOUNCE_MS = 250;

// Matches for a beekeeper, season and week do not change within a session, so
// replaying the season or switching back costs no request.
const cache = new Map<string, MatchCard[]>();
// Each beekeeper's latest cards, shown while another week loads.
const latest = new Map<string, MatchCard[]>();

/** GET /matches through the session cache, so every caller shares one answer. */
export async function loadMatches(
  keeperId: string,
  year: Season,
  week: number,
  signal: AbortSignal,
): Promise<MatchCard[]> {
  const key = `${keeperId}|${year}|${week}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const cards = await getMatches(keeperId, year, week, signal);
  cache.set(key, cards);
  latest.set(keeperId, cards);
  return cards;
}

export type Matches = {
  /** The selected beekeeper's cards; the last week's stay while a new week loads. */
  cards?: MatchCard[];
  pending: boolean;
  error: boolean;
  retry: () => void;
};

/** GET /matches for a beekeeper, season and week, refetched when any changes. */
export function useMatches(
  keeperId: string,
  year: Season,
  week: number,
): Matches {
  const key = `${keeperId}|${year}|${week}`;
  const cached = cache.get(key);
  const [attempt, setAttempt] = useState(0);
  // The key of the last response (to re-render) and whether it failed.
  const [done, setDone] = useState({ key: "", error: false });

  useEffect(() => {
    if (cache.has(key)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadMatches(keeperId, year, week, controller.signal)
        .then(() => setDone({ key, error: false }))
        .catch(() => {
          if (!controller.signal.aborted) setDone({ key, error: true });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, keeperId, year, week, attempt]);

  const retry = useCallback(() => {
    setDone({ key: "", error: false });
    setAttempt((a) => a + 1);
  }, []);
  // A week that failed while the API was away loads once it is back.
  useBackOnline(retry);

  const error = !cached && done.key === key && done.error;
  return {
    cards: cached ?? latest.get(keeperId),
    pending: !cached && !error,
    error,
    retry,
  };
}
