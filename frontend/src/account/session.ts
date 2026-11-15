// Mock sign-in: accounts live in this browser's localStorage only. Nothing is
// sent to a server and no password is kept, so the demo holds no personal data.
import { useSyncExternalStore } from "react";
import type { Polygon } from "../api/client";

/** The beekeeper's own moving costs; an unset one uses the marketplace default. */
export type Costs = Partial<{
  fuel_price_per_l: number;
  vehicle_cost_per_km: number;
  hourly_labor_cost: number;
  average_speed_kmh: number;
  loading_hours: number;
  legs: number;
  extra_feed_cost: number;
  other_placement_cost: number;
}>;

/** A parcel the beekeeper drew: an apiary site whose bloom is modelled where it lies. */
export type OwnParcel = {
  id: string;
  name: string;
  crop: string;
  geometry: Polygon;
  irrigated: boolean;
  /** ISO dates; used where the crop has no bloom model. */
  declared_bloom: { start: string; end: string } | null;
};

/** A request to place hives on a listed parcel for a period (stored locally). */
export type Placement = {
  id: string;
  parcel_id: string;
  crop: string;
  service_type: "pollination" | "forage";
  /** ISO dates of the stay. */
  start: string;
  end: string;
  colonies: number;
  /** Base-case benefit relative to the alternative when requested, if known. */
  benefit_eur: number | null;
  created_at: string;
};

export type Account = {
  email: string;
  name: string;
  colonies: number;
  max_distance_km: number;
  /** ISO dates; only month and day count, each season uses the same dates. */
  availability: { start: string; end: string };
  vehicle_l_per_100km: number;
  alternative_contribution_eur: number;
  costs: Costs;
  parcels: OwnParcel[];
  /** The own parcel moves start from; "" until one is drawn. */
  home_id: string;
  placements: Placement[];
};

const ACCOUNTS_KEY = "pollination.accounts";
const SESSION_KEY = "pollination.session";
export const DEMO_EMAIL = "demo";

type Store = { accounts: Record<string, Account>; email: string };

function read(): Store {
  try {
    return {
      accounts: JSON.parse(
        localStorage.getItem(ACCOUNTS_KEY) ?? "{}",
      ) as Store["accounts"],
      email: localStorage.getItem(SESSION_KEY) ?? "",
    };
  } catch {
    return { accounts: {}, email: "" }; // storage blocked: a session-only account
  }
}

let store = read();
const listeners = new Set<() => void>();

function write(next: Store) {
  store = next;
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next.accounts));
    localStorage.setItem(SESSION_KEY, next.email);
  } catch {
    // Storage blocked or full: the account still works until the page reloads.
  }
  for (const notify of listeners) notify();
}

function subscribe(notify: () => void) {
  // Another tab signed in or out, or changed the account.
  const sync = () => {
    store = read();
    notify();
  };
  listeners.add(notify);
  window.addEventListener("storage", sync);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", sync);
  };
}

/** The signed-in account, or null. */
export const currentAccount = (): Account | null =>
  store.accounts[store.email] ?? null;

/** The signed-in account, re-rendering on every change; null when signed out. */
export const useAccount = (): Account | null =>
  useSyncExternalStore(subscribe, currentAccount);

const key = (email: string) => email.trim().toLowerCase();

const blank = (email: string, name: string): Account => ({
  email,
  name,
  colonies: 40,
  max_distance_km: 60,
  availability: { start: "2024-04-01", end: "2024-08-31" },
  vehicle_l_per_100km: 12,
  alternative_contribution_eur: 0,
  costs: {},
  parcels: [],
  home_id: "",
  placements: [],
});

/** Create an account and sign in; false when the email is already registered. */
export function register(name: string, email: string): boolean {
  const id = key(email);
  if (!id || store.accounts[id]) return false;
  write({
    accounts: { ...store.accounts, [id]: blank(id, name.trim()) },
    email: id,
  });
  return true;
}

/** Sign in to an account of this browser; false when there is none. */
export function signIn(email: string): boolean {
  const id = key(email);
  if (!store.accounts[id]) return false;
  write({ ...store, email: id });
  return true;
}

// A small apiary site inside the demo data's region, so matches show at once.
const DEMO_HOME: OwnParcel = {
  id: "own-demo",
  name: "Home apiary",
  crop: "black_locust",
  irrigated: false,
  declared_bloom: null,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [21.748, 47.789],
        [21.752, 47.789],
        [21.752, 47.792],
        [21.748, 47.792],
        [21.748, 47.789],
      ],
    ],
  },
};

/** Sign in as the ready-made demo beekeeper (created on first use). */
export function signInDemo() {
  const demo: Account = store.accounts[DEMO_EMAIL] ?? {
    ...blank(DEMO_EMAIL, "Demo beekeeper"),
    colonies: 50,
    parcels: [DEMO_HOME],
    home_id: DEMO_HOME.id,
  };
  write({
    accounts: { ...store.accounts, [DEMO_EMAIL]: demo },
    email: DEMO_EMAIL,
  });
}

export function signOut() {
  write({ ...store, email: "" });
}

/** Change the signed-in account; does nothing when signed out. */
export function updateAccount(change: (account: Account) => Account) {
  const account = currentAccount();
  if (!account) return;
  write({
    ...store,
    accounts: { ...store.accounts, [store.email]: change(account) },
  });
}

/** The own parcel moves start from: the chosen one, else the first. */
export const homeParcel = (account: Account): OwnParcel | undefined =>
  account.parcels.find((p) => p.id === account.home_id) ?? account.parcels[0];

/** Add an own parcel; the first one becomes the home apiary. */
export function addParcel(parcel: OwnParcel) {
  updateAccount((a) => ({
    ...a,
    parcels: [...a.parcels, parcel],
    home_id: a.home_id || parcel.id,
  }));
}

export function updateParcel(id: string, patch: Partial<OwnParcel>) {
  updateAccount((a) => ({
    ...a,
    parcels: a.parcels.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }));
}

/** Remove an own parcel; another one takes over as home if it was the home. */
export function removeParcel(id: string) {
  updateAccount((a) => {
    const parcels = a.parcels.filter((p) => p.id !== id);
    const home = a.home_id === id ? (parcels[0]?.id ?? "") : a.home_id;
    return { ...a, parcels, home_id: home };
  });
}

export function addPlacement(placement: Placement) {
  updateAccount((a) => ({ ...a, placements: [...a.placements, placement] }));
}

export function cancelPlacement(id: string) {
  updateAccount((a) => ({
    ...a,
    placements: a.placements.filter((p) => p.id !== id),
  }));
}

/** A short unique id for parcels and placements made in this browser. */
export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
