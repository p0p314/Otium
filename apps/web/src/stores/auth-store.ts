import type { AuthUser } from "@otium/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setSession: (user: AuthUser, token: string) => void;
  clear: () => void;
}

/**
 * État de **session** (UI/global) — géré par Zustand, pas par TanStack Query (CLAUDE.md).
 * Persiste le jeton pour survivre au rechargement.
 * NB : stockage localStorage = compromis V1 (exposé au XSS) ; durcissement possible
 * ultérieurement via cookie httpOnly côté API.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setSession: (user, token) => set({ user, token }),
      clear: () => set({ user: null, token: null }),
    }),
    { name: "otium-auth" },
  ),
);
