import { useEffect, useMemo, useState } from "react";
import {
  getOwnTimeline,
  type OwnParcelTimeline,
  type Parcel,
  type ParcelWeek,
  type Season,
} from "../api/client";
import type { OwnParcel } from "../account/session";

// One answer per parcel version and season: redrawing or changing the crop asks again.
const cache = new Map<string, OwnParcelTimeline>();
// Requests on their way. Not cancelled when the parcel list changes: the server
// finishes the POWER read anyway, and its answer fills the cache.
const inflight = new Map<string, Promise<OwnParcelTimeline>>();

const toRequest = (p: OwnParcel) => ({
  id: p.id,
  crop: p.crop,
  geometry: p.geometry,
  irrigated: p.irrigated,
  declared_bloom: p.declared_bloom,
});
const keyOf = (p: OwnParcel, year: Season) =>
  `${year}|${JSON.stringify(toRequest(p))}`;

/** The parcel as the map draws it before the server has measured and modelled it. */
const draft = (p: OwnParcel): Parcel => ({
  ...toRequest(p),
  grower_id: "you",
  area_ha: 0,
  illustrative: false,
  service_type: "forage",
  requested_colonies: null,
  natura_status: "clear",
});

export type OwnParcels = {
  /** The beekeeper's parcels in the API's shape (area 0 until modelled). */
  parcels: Parcel[];
  /** Their weekly bloom for the season, for the ones already modelled. */
  weeks: ParcelWeek[];
  pending: boolean;
  /** Ids of the parcels whose bloom request failed. */
  failed: ReadonlySet<string>;
  retry: () => void;
};

/** Bloom of the beekeeper's own parcels, modelled by the API where each one lies. */
export function useOwnParcels(own: OwnParcel[], year: Season): OwnParcels {
  const keys = useMemo(() => own.map((p) => keyOf(p, year)), [own, year]);
  const signature = keys.join("\n");
  const [loaded, setLoaded] = useState(0);
  const [failedKeys, setFailedKeys] = useState<ReadonlySet<string>>(new Set());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    own.forEach((p, i) => {
      const key = keys[i];
      if (cache.has(key)) return;
      let request = inflight.get(key);
      if (!request) {
        request = getOwnTimeline(
          toRequest(p),
          year,
          new AbortController().signal,
        )
          .then((answer) => {
            cache.set(key, answer);
            return answer;
          })
          .finally(() => inflight.delete(key));
        inflight.set(key, request);
      }
      request
        .then(() => !stale && setLoaded((n) => n + 1))
        .catch(() => !stale && setFailedKeys((f) => new Set(f).add(key)));
    });
    return () => {
      stale = true;
    };
    // `signature` says when `own` or `year` changed what is asked for.
  }, [signature, attempt]);

  return useMemo(() => {
    const answers = keys.map((k) => cache.get(k));
    return {
      parcels: own.map((p, i) => answers[i]?.parcel ?? draft(p)),
      weeks: answers.flatMap((a) => a?.weeks ?? []),
      pending: answers.some((a, i) => !a && !failedKeys.has(keys[i])),
      failed: new Set(
        own
          .filter((_, i) => !answers[i] && failedKeys.has(keys[i]))
          .map((p) => p.id),
      ),
      retry: () => {
        setFailedKeys(new Set());
        setAttempt((a) => a + 1);
      },
    };
    // `loaded` re-reads the cache when an answer arrives.
  }, [signature, loaded, failedKeys]);
}
