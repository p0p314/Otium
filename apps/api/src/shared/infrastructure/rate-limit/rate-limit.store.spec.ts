import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitStore } from "./rate-limit.store";

describe("RateLimitStore", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("autorise jusqu'au plafond puis bloque", () => {
    const store = new RateLimitStore();

    expect(store.hit("k", 2, 60_000).allowed).toBe(true);
    expect(store.hit("k", 2, 60_000).allowed).toBe(true);
    const blocked = store.hit("k", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("réinitialise le compteur après la fenêtre", () => {
    const store = new RateLimitStore();
    store.hit("k", 1, 60_000);
    expect(store.hit("k", 1, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(store.hit("k", 1, 60_000).allowed).toBe(true);
  });

  it("compte les clés indépendamment", () => {
    const store = new RateLimitStore();
    expect(store.hit("a", 1, 60_000).allowed).toBe(true);
    expect(store.hit("b", 1, 60_000).allowed).toBe(true);
    expect(store.hit("a", 1, 60_000).allowed).toBe(false);
  });
});
