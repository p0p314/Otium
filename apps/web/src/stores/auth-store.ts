import type { AuthUser } from "@otium/types";
import { create } from "zustand";

/** Statut de résolution de la session au démarrage (évite le flash « déconnecté »). */
export type AuthStatus = "unknown" | "authenticated" | "anonymous";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  setSession: (user: AuthUser) => void;
  clear: () => void;
}

/**
 * État de **session** (UI/global) — géré par Zustand, pas par TanStack Query (CLAUDE.md).
 *
 * Rien n'est persisté côté JavaScript : ni le jeton (cookie **httpOnly**), ni le profil
 * (e-mail…). La source de vérité est le cookie de session ; au démarrage, l'app restaure
 * l'utilisateur via `GET /auth/me` (voir `lib/session.ts`). Aucune donnée personnelle ne
 * réside donc dans `localStorage` (confidentialité poste partagé, surface XSS — VULN-10).
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "unknown",
  setSession: (user) => set({ user, status: "authenticated" }),
  clear: () => set({ user: null, status: "anonymous" }),
}));
