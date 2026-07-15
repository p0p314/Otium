import type { Request, Response } from "express";

/**
 * Cookie de session **httpOnly** : le jeton n'est jamais exposé au JavaScript du
 * navigateur (durcissement anti-XSS vs. localStorage). Le SDK envoie le cookie via
 * `credentials: "include"` ; les clients non-navigateur (mobile) gardent le Bearer.
 */
export const SESSION_COOKIE_NAME = "otium_session";

/** Pose le cookie de session avec une durée alignée sur l'expiration du jeton. */
export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
  isProduction: boolean,
): void {
  const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge,
  });
}

/** Efface le cookie de session (déconnexion). */
export function clearSessionCookie(response: Response, isProduction: boolean): void {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
  });
}

/**
 * Lit le jeton depuis l'en-tête `Cookie` sans dépendance externe (éco-conception :
 * on évite `cookie-parser`). Renvoie `null` si le cookie de session est absent.
 */
export function readSessionCookie(request: Request): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(part.slice(index + 1).trim()) || null;
    }
  }
  return null;
}
