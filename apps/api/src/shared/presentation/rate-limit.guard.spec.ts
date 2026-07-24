import { HttpException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { RateLimitStore } from "../infrastructure/rate-limit/rate-limit.store";
import type { RateLimitOptions } from "./rate-limit.decorator";
import { RateLimitGuard } from "./rate-limit.guard";

function makeContext(setHeader = vi.fn()): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ ip: "1.2.3.4" }),
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(
  options: RateLimitOptions | undefined,
  hit: RateLimitStore["hit"],
): RateLimitGuard {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(options) } as unknown as Reflector;
  const store = { hit } as unknown as RateLimitStore;
  return new RateLimitGuard(reflector, store);
}

describe("RateLimitGuard", () => {
  it("laisse passer les routes non annotées (pas de métadonnée)", () => {
    const hit = vi.fn();
    const guard = makeGuard(undefined, hit as unknown as RateLimitStore["hit"]);

    expect(guard.canActivate(makeContext())).toBe(true);
    expect(hit).not.toHaveBeenCalled();
  });

  it("autorise sous le plafond", () => {
    const hit = vi.fn().mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    const guard = makeGuard(
      { limit: 5, windowSeconds: 60 },
      hit as unknown as RateLimitStore["hit"],
    );

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it("lève 429 et pose Retry-After au dépassement", () => {
    const setHeader = vi.fn();
    const hit = vi.fn().mockReturnValue({ allowed: false, retryAfterSeconds: 42 });
    const guard = makeGuard(
      { limit: 1, windowSeconds: 60 },
      hit as unknown as RateLimitStore["hit"],
    );

    try {
      guard.canActivate(makeContext(setHeader));
      expect.unreachable("aurait dû lever");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
    expect(setHeader).toHaveBeenCalledWith("Retry-After", "42");
  });
});
