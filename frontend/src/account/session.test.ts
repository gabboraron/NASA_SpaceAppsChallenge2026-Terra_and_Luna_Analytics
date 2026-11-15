import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OwnParcel, Placement } from "./session";

// The store is read from localStorage when the module loads.
let saved: Record<string, string>;
const load = () => {
  vi.resetModules();
  return import("./session");
};

beforeEach(() => {
  saved = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => saved[k] ?? null,
    setItem: (k: string, v: string) => {
      saved[k] = v;
    },
  });
});

const parcel = (id: string): OwnParcel => ({
  id,
  name: id,
  crop: "black_locust",
  irrigated: false,
  declared_bloom: null,
  geometry: { type: "Polygon", coordinates: [] },
});

const placement = (id: string): Placement => ({
  id,
  parcel_id: "P07",
  crop: "sunflower",
  service_type: "pollination",
  start: "2024-07-01",
  end: "2024-07-14",
  colonies: 40,
  benefit_eur: null,
  created_at: "2024-06-20T10:00:00Z",
});

describe("session", () => {
  it("starts signed out", async () => {
    const s = await load();
    expect(s.currentAccount()).toBeNull();
  });

  it("registers once per email and signs in", async () => {
    const s = await load();
    expect(s.register(" Anna ", " Anna@Example.org ")).toBe(true);
    expect(s.currentAccount()).toMatchObject({
      name: "Anna",
      email: "anna@example.org",
      parcels: [],
      home_id: "",
    });
    expect(s.register("Other", "anna@example.org")).toBe(false);
    expect(s.register("Nobody", "  ")).toBe(false);
    expect(s.currentAccount()?.name).toBe("Anna");
  });

  it("signs in only to an account of this browser, and out", async () => {
    const s = await load();
    expect(s.signIn("anna@example.org")).toBe(false);
    s.register("Anna", "anna@example.org");
    s.signOut();
    expect(s.currentAccount()).toBeNull();
    expect(s.signIn("ANNA@example.org")).toBe(true);
    expect(s.currentAccount()?.name).toBe("Anna");
  });

  it("keeps the account and the session across a reload", async () => {
    (await load()).register("Anna", "anna@example.org");
    expect((await load()).currentAccount()?.name).toBe("Anna");
  });

  it("stores no password", async () => {
    (await load()).register("Anna", "anna@example.org");
    expect(JSON.stringify(saved)).not.toMatch(/password/i);
  });

  it("works without storage until the page reloads", async () => {
    vi.stubGlobal("localStorage", undefined);
    const s = await load();
    expect(s.register("Anna", "anna@example.org")).toBe(true);
    expect(s.currentAccount()?.name).toBe("Anna");
  });

  it("signs in the demo beekeeper with a home parcel, keeping its changes", async () => {
    const s = await load();
    s.signInDemo();
    const demo = s.currentAccount()!;
    expect(demo.email).toBe(s.DEMO_EMAIL);
    expect(s.homeParcel(demo)?.id).toBe(demo.home_id);
    s.updateAccount((a) => ({ ...a, colonies: 77 }));
    s.signOut();
    s.signInDemo();
    expect(s.currentAccount()?.colonies).toBe(77);
  });

  it("updates the signed-in account only", async () => {
    const s = await load();
    s.updateAccount((a) => ({ ...a, colonies: 99 })); // signed out: no-op
    expect(saved).toEqual({});
    s.register("Anna", "anna@example.org");
    s.register("Ben", "ben@example.org");
    s.updateAccount((a) => ({ ...a, costs: { legs: 4 } }));
    expect(s.currentAccount()?.costs).toEqual({ legs: 4 });
    s.signIn("anna@example.org");
    expect(s.currentAccount()?.costs).toEqual({});
  });

  it("makes the first parcel home and hands home over on removal", async () => {
    const s = await load();
    s.register("Anna", "anna@example.org");
    s.addParcel(parcel("a"));
    s.addParcel(parcel("b"));
    s.addParcel(parcel("c"));
    expect(s.currentAccount()?.home_id).toBe("a");

    s.updateParcel("b", { name: "Orchard", irrigated: true });
    expect(s.currentAccount()?.parcels[1]).toMatchObject({
      id: "b",
      name: "Orchard",
      irrigated: true,
    });

    s.removeParcel("c"); // not the home: home stays
    expect(s.currentAccount()?.home_id).toBe("a");
    s.removeParcel("a"); // the home: the next parcel takes over
    expect(s.currentAccount()?.home_id).toBe("b");
    expect(s.homeParcel(s.currentAccount()!)?.name).toBe("Orchard");
    s.removeParcel("b");
    expect(s.currentAccount()).toMatchObject({ parcels: [], home_id: "" });
    expect(s.homeParcel(s.currentAccount()!)).toBeUndefined();
  });

  it("adds and cancels placements", async () => {
    const s = await load();
    s.register("Anna", "anna@example.org");
    s.addPlacement(placement("r1"));
    s.addPlacement(placement("r2"));
    s.cancelPlacement("r1");
    expect(s.currentAccount()?.placements.map((p) => p.id)).toEqual(["r2"]);
  });

  it("makes distinct ids with the prefix", async () => {
    const s = await load();
    expect(s.newId("own")).toMatch(/^own-/);
    expect(s.newId("own")).not.toBe(s.newId("own"));
  });
});
