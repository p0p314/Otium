import { api } from "./api";
import { useAuthStore } from "../stores/auth-store";

let bootstrapPromise: Promise<void> | null = null;

/**
 * Restaure la session au démarrage à partir du cookie **httpOnly** (`GET /auth/me`) — la
 * seule source de vérité, puisque rien n'est persisté côté JavaScript (VULN-10). Idempotent :
 * la résolution n'a lieu qu'une fois par chargement d'app ; les appelants (garde de route,
 * point d'entrée) partagent la même promesse.
 */
export function ensureSessionLoaded(): Promise<void> {
  bootstrapPromise ??= loadSession();
  return bootstrapPromise;
}

async function loadSession(): Promise<void> {
  try {
    const user = await api.me();
    useAuthStore.getState().setSession(user);
  } catch {
    // Cookie absent/expiré → session anonyme (pas d'erreur : cas nominal du visiteur).
    useAuthStore.getState().clear();
  }
}
