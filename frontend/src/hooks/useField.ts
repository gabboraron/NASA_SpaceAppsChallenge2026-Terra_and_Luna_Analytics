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
type Kept<T> = Answer<T> & { key: string | null };

// Answers by request key, shared for the session: reselecting a parcel or going
// back to a season reads no NASA source again. Failed requests are dropped.
const answers = new Map<string, Promise<unknown>>();

/** Run `load` once per `key`; the answer of an older key is never shown. */
export function useAnswer<T>(
  key: string | null,
  load: () => Promise<T>,
): Answer<T> {
  const [kept, setKept] = useState<Kept<T>>({ key: null });
  useEffect(() => {
    if (key === null) return;
    let request = answers.get(key) as Promise<T> | undefined;
    if (!request) {
      request = load();
      request.catch(() => answers.delete(key));
      answers.set(key, request);
    }
    let stale = false;
    request
      .then((data) => !stale && setKept({ key, data }))
      .catch(() => !stale && setKept({ key, error: true }));
    return () => {
      stale = true;
    };
    // `load` is rebuilt every render; `key` says when the request changes.
  }, [key]);
  return kept.key === key ? kept : {};
}

/**
 * Live NASA reads for a drawn polygon. POWER and HLS go out in parallel, so the
 * weather shows in seconds while the satellite read is still on its way.
 */
export function useField(polygon: Polygon | null, year: Season) {
  const shape = useMemo(() => polygon && JSON.stringify(polygon), [polygon]);
  const signal = new AbortController().signal; // shared requests run to the end
  const power = useAnswer<PowerResponse>(
    shape && `power|${year}|${shape}`,
    () => getPolygonPower(polygon!, year, signal),
  );
  const hls = useAnswer<HlsResponse>(shape && `hls|${shape}`, () =>
    getPolygonHls(polygon!, signal),
  );
  return { power, hls };
}
