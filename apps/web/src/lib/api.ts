import { OtiumClient } from "@otium/api-sdk";
import { useAuthStore } from "../stores/auth-store";

// En production (service unique), l'API sert le SPA : on l'appelle en same-origin
// (`/api`), ce qui garantit l'envoi du cookie de session (SameSite=Lax). En dev,
// on cible l'API Vite/Nest locale. `VITE_API_URL` permet de forcer une URL explicite.
const baseUrl =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/api" : "http://localhost:3000/api");

/**
 * Instance unique du SDK — seul point d'accès du frontend à l'API (CLAUDE.md).
 * L'authentification repose sur le cookie de session **httpOnly** (envoyé via
 * `credentials: "include"`) : aucun jeton n'est manipulé côté JavaScript.
 */
export const api = new OtiumClient({
  baseUrl,
  // Session expirée/invalide (cookie absent) alors que l'UI se croit connectée :
  // on purge l'état local et on renvoie vers la connexion pour ré-obtenir un cookie.
  onUnauthorized: () => {
    if (useAuthStore.getState().user === null) return;
    useAuthStore.getState().clear();
    const { pathname } = window.location;
    if (pathname !== "/login" && pathname !== "/register") {
      window.location.assign("/login");
    }
  },
});
