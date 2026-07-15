import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import {
  clearSessionCookie,
  readSessionCookie,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "./session-cookie";

function requestWithCookie(header: string | undefined): Request {
  return { headers: { cookie: header } } as unknown as Request;
}

describe("readSessionCookie", () => {
  it("extrait le jeton du cookie de session parmi d'autres cookies", () => {
    const req = requestWithCookie(`theme=dark; ${SESSION_COOKIE_NAME}=abc123; other=1`);
    expect(readSessionCookie(req)).toBe("abc123");
  });

  it("renvoie null en l'absence d'en-tête Cookie", () => {
    expect(readSessionCookie(requestWithCookie(undefined))).toBeNull();
  });

  it("renvoie null si le cookie de session est absent", () => {
    expect(readSessionCookie(requestWithCookie("theme=dark"))).toBeNull();
  });

  it("décode les valeurs encodées", () => {
    const req = requestWithCookie(`${SESSION_COOKIE_NAME}=a%20b`);
    expect(readSessionCookie(req)).toBe("a b");
  });
});

describe("setSessionCookie / clearSessionCookie", () => {
  it("pose un cookie httpOnly avec une durée dérivée de l'expiration", () => {
    const cookie = vi.fn();
    const response = { cookie } as unknown as Response;
    const expiresAt = new Date(Date.now() + 60_000);

    setSessionCookie(response, "tok", expiresAt, true);

    expect(cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      "tok",
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax", path: "/" }),
    );
    const options = cookie.mock.calls[0]?.[2] as { maxAge: number };
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it("efface le cookie de session", () => {
    const clearCookie = vi.fn();
    const response = { clearCookie } as unknown as Response;

    clearSessionCookie(response, false);

    expect(clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, secure: false, path: "/" }),
    );
  });
});
