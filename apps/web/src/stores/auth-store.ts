import type { AuthUser } from "@otium/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: AuthUser | null;
  setSession: (user: AuthUser) => void;
  clear: () => void;
}

/**
 * État de **session** (UI/global) — géré par Zustand, pas par TanStack Query (CLAUDE.md).
 * Le jeton n'est plus stocké côté JavaScript : il vit dans un cookie **httpOnly**
 * (durcissement anti-XSS). On ne persiste que l'utilisateur, pour un rendu immédiat
 * de l'état connecté au rechargement ; l'autorisation réelle repose sur le cookie.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setSession: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    { name: "otium-auth" },
  ),
);
