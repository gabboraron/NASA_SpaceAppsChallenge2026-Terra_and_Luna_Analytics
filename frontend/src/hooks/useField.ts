import { useEffect, useMemo, useState } from "react";
import {
  getPolygonHls,
  getPolygonPower,
  type HlsResponse,
  type Polygon,
  type PowerResponse,
  type Season,
} from "../api/client";

/** One request's state: neither field set while it is on its way. */
export type Answer<T> = { data?: T; error?: boolean };
type Kept<T> = Answer<T> & { key: unknown };

/**
 * Run `load` whenever `key` (compared by reference) changes; the answer of an
 * older key is never shown.
 */
function useAnswer<T>(
  key: object | null,
  load: ((signal: AbortSignal) => Promise<T>) | null,
): Answer<T> {
  const [kept, setKept] = useState<Kept<T>>({ key: null });
  useEffect(() => {
    if (!load) return;
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setKept({ key, data }))
      .catch(() => {
        if (!controller.signal.aborted) setKept({ key, error: true });
      });
    return () => controller.abort();
    // `load` is rebuilt every render; `key` says when the request changes.
  }, [key]);
  return kept.key === key ? kept : {};
}

/**
 * Live NASA reads for a drawn polygon. POWER and HLS go out in parallel, so the
 * weather shows in seconds while the satellite read is still on its way.
 */
export function useField(polygon: Polygon | null, year: Season) {
  const season = useMemo(() => polygon && { polygon, year }, [polygon, year]);
  const power = useAnswer<PowerResponse>(
    season,
    polygon && ((signal) => getPolygonPower(polygon, year, signal)),
  );
  const hls = useAnswer<HlsResponse>(
    polygon,
    polygon && ((signal) => getPolygonHls(polygon, signal)),
  );
  return { power, hls };
}
