import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { CSRF_HEADER, CsrfHeaderGuard } from "./csrf-header.guard";

function context(method: string, headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  } as unknown as ExecutionContext;
}

describe("CsrfHeaderGuard", () => {
  const guard = new CsrfHeaderGuard();

  it("laisse passer les méthodes sûres sans en-tête", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(guard.canActivate(context(method))).toBe(true);
    }
  });

  it("autorise une mutation portant l'en-tête anti-CSRF", () => {
    expect(guard.canActivate(context("POST", { [CSRF_HEADER]: "1" }))).toBe(true);
  });

  it("rejette une mutation sans l'en-tête (login CSRF, formulaire cross-site)", () => {
    expect(() => guard.canActivate(context("POST"))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context("DELETE"))).toThrow(ForbiddenException);
  });
});
