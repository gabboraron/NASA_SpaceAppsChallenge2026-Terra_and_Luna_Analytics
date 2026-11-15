import { useEffect, useSyncExternalStore } from "react";

// Whether the API answers. A failed request asks /api/health; while that fails
// the app shows a banner and asks again every few seconds, and the loads that
// failed run again once it answers (WP23).
export const HEALTH_POLL_MS = 5000;

let online = true;
let watching = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (online === value) return;
  online = value;
  for (const listener of listeners) listener();
}

async function healthy(): Promise<boolean> {
  try {
    return (await fetch("/api/health", { cache: "no-store" })).ok;
  } catch {
    return false;
  }
}

/**
 * After a failed request: check the API, and if it is down, keep checking until
 * it is back. One watch runs at a time, however many requests failed.
 */
export async function checkApi(): Promise<void> {
  if (watching) return;
  watching = true;
  try {
    while (!(await healthy())) {
      set(false);
      await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
    }
    set(true);
  } finally {
    watching = false;
  }
}

export const isOnline = () => online;

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders when the API goes away or comes back. */
export const useOnline = () => useSyncExternalStore(subscribe, isOnline);

/** Calls `onBack` (keep it stable) each time the API answers again after an outage. */
export function useBackOnline(onBack: () => void) {
  useEffect(() => {
    let was = online;
    return subscribe(() => {
      if (online && !was) onBack();
      was = online;
    });
  }, [onBack]);
}
