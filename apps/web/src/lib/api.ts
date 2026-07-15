import { OtiumClient } from "@otium/api-sdk";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/**
 * Instance unique du SDK — seul point d'accès du frontend à l'API (CLAUDE.md).
 * L'authentification repose sur le cookie de session **httpOnly** (envoyé via
 * `credentials: "include"`) : aucun jeton n'est manipulé côté JavaScript.
 */
export const api = new OtiumClient({ baseUrl });
