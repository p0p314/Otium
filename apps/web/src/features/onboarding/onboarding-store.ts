import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  /** Date (YYYY-MM-DD) du dernier affichage automatique de l'invite « écran d'accueil ». */
  a2hsLastShownDate: string | null;
  /** Invite d'import post-inscription en attente (transitoire, non persistée). */
  importPromptPending: boolean;
  /** Enregistre l'affichage du jour de l'invite « écran d'accueil ». */
  markA2hsShown: (date: string) => void;
  /** Ouvre l'invite d'import (déclenchée après une inscription). */
  openImportPrompt: () => void;
  /** Ferme l'invite d'import. */
  dismissImportPrompt: () => void;
}

/** Date du jour au format `YYYY-MM-DD` (comparaison « une fois par jour »). */
export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * État des invites d'onboarding (préférence UI locale — Zustand, pas TanStack Query).
 * Seule la date de dernière invite « écran d'accueil » est **persistée** ; l'invite
 * d'import post-inscription est transitoire (montrée une fois dans la session courante).
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      a2hsLastShownDate: null,
      importPromptPending: false,
      markA2hsShown: (date) => set({ a2hsLastShownDate: date }),
      openImportPrompt: () => set({ importPromptPending: true }),
      dismissImportPrompt: () => set({ importPromptPending: false }),
    }),
    {
      name: "otium-onboarding",
      // On ne persiste pas l'invite d'import : elle ne vaut que pour la session d'inscription.
      partialize: (state) => ({ a2hsLastShownDate: state.a2hsLastShownDate }),
    },
  ),
);
