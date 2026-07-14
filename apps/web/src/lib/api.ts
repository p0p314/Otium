import { OtiumClient } from "@otium/api-sdk";
import { useAuthStore } from "../stores/auth-store";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/**
 * Instance unique du SDK — seul point d'accès du frontend à l'API (CLAUDE.md).
 * Le jeton de session est lu dynamiquement depuis le store à chaque requête.
 */
export const api = new OtiumClient({
  baseUrl,
  getToken: () => useAuthStore.getState().token,
});
