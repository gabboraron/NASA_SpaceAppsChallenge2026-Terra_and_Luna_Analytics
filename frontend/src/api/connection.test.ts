import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Each test gets fresh module state (online flag, running watch, listeners).
const load = async () => {
  vi.resetModules();
  return {
    connection: await import("./connection"),
    client: await import("./client"),
  };
};

/** A fetch whose /api/health answers come from `health` in turn; others from `api`. */
function stubFetch(health: boolean[], api?: () => Promise<Response>) {
  const calls: string[] = [];
  const fake = vi.fn((url: string) => {
    calls.push(url);
    if (url === "/api/health") {
      const up = health.shift() ?? true;
      return up
        ? Promise.resolve(new Response("{}", { status: 200 }))
        : Promise.reject(new TypeError("Failed to fetch"));
    }
    return api ? api() : Promise.reject(new TypeError("Failed to fetch"));
  });
  vi.stubGlobal("fetch", fake);
  return calls;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("checkApi", () => {
  it("stays online when the health check answers", async () => {
    const { connection } = await load();
    const calls = stubFetch([true]);
    await connection.checkApi();
    expect(connection.isOnline()).toBe(true);
    expect(calls).toEqual(["/api/health"]);
  });

  it("goes offline, keeps asking, and comes back", async () => {
    const { connection } = await load();
    const calls = stubFetch([false, false, true]);
    const seen: boolean[] = [];
    connection.subscribe(() => seen.push(connection.isOnline()));

    const watch = connection.checkApi();
    await vi.advanceTimersByTimeAsync(0);
    expect(connection.isOnline()).toBe(false);
    await vi.advanceTimersByTimeAsync(connection.HEALTH_POLL_MS);
    expect(connection.isOnline()).toBe(false);
    await vi.advanceTimersByTimeAsync(connection.HEALTH_POLL_MS);
    await watch;

    expect(connection.isOnline()).toBe(true);
    expect(calls).toHaveLength(3);
    expect(seen).toEqual([false, true]); // one change each way, no repeats
  });

  it("runs one watch however many requests fail", async () => {
    const { connection } = await load();
    const calls = stubFetch([false, true]);
    const watches = [1, 2, 3].map(() => connection.checkApi());
    await vi.advanceTimersByTimeAsync(connection.HEALTH_POLL_MS);
    await Promise.all(watches);
    expect(calls).toHaveLength(2);
  });

  it("treats a proxy's 502 from /health as down", async () => {
    const { connection } = await load();
    let first = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        const status = first ? 502 : 200;
        first = false;
        return Promise.resolve(new Response("", { status }));
      }),
    );
    const watch = connection.checkApi();
    await vi.advanceTimersByTimeAsync(0);
    expect(connection.isOnline()).toBe(false);
    await vi.advanceTimersByTimeAsync(connection.HEALTH_POLL_MS);
    await watch;
    expect(connection.isOnline()).toBe(true);
  });
});

describe("API client", () => {
  it("checks the API after a failed request", async () => {
    const { client, connection } = await load();
    const calls = stubFetch([false, true]);
    await expect(client.getParcels()).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual(["/api/parcels", "/api/health"]);
    expect(connection.isOnline()).toBe(false);
  });

  it("checks after a 502 from the proxy, not only a network error", async () => {
    const { client } = await load();
    const calls = stubFetch([true], () =>
      Promise.resolve(new Response("", { status: 502 })),
    );
    await expect(client.getActors()).rejects.toThrow("(502)");
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toContain("/api/health");
  });

  it("does not check when the caller aborted the request", async () => {
    const { client } = await load();
    const controller = new AbortController();
    const calls = stubFetch([], () => {
      controller.abort();
      return Promise.reject(new DOMException("aborted", "AbortError"));
    });
    await expect(
      client.getMatches("B1", 2024, 20, controller.signal),
    ).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).not.toContain("/api/health");
  });
});
