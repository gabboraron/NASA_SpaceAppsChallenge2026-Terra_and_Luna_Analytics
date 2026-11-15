import { useEffect, useState } from "react";
import {
  getSmapArea,
  type Season,
  type SmapArea,
  type View,
} from "../api/client";

/** How often a view still being fetched is asked for again. */
const POLL_MS = 3_000;

type Kept = { key: string; area: SmapArea };

/**
 * A week's SMAP cells under the map view. The server fetches a new area in the
 * background, so a pending answer is asked for again; the cells shown stay until
 * the season or week changes.
 */
export function useSmapArea(
  on: boolean,
  year: Season,
  week: number,
  view: View | null,
): SmapArea | null {
  const [kept, setKept] = useState<Kept | null>(null);
  const [tick, setTick] = useState(0);
  const key = `${year}:${week}`;
  useEffect(() => {
    if (!on || !view) return;
    let stale = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    getSmapArea(year, week, view)
      .then((area) => {
        if (stale) return;
        setKept({ key, area });
        if (area.pending)
          timer = setTimeout(() => setTick((t) => t + 1), POLL_MS);
      })
      .catch(() => {}); // the season's own cells stay; the next move asks again
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [on, year, week, view, key, tick]);
  return on && kept?.key === key ? kept.area : null;
}
