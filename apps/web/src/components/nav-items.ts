import { Clapperboard, Home, Search, type LucideIcon } from "lucide-react";

/** Chemins de premier niveau connus du routeur (typage des liens TanStack Router). */
export type AppPath = "/" | "/search" | "/library" | "/lists" | "/stats" | "/profile";

/** Une destination de navigation (partagée entre l'en-tête desktop et la barre mobile). */
export interface NavItem {
  readonly to: AppPath;
  /** Libellé complet (desktop) ; `short` sert à la barre mobile étroite. */
  readonly label: string;
  readonly short: string;
  readonly icon: LucideIcon;
  /** Actif seulement en correspondance exacte (utile pour l'accueil « / »). */
  readonly exact?: boolean;
  /** Réservé aux utilisateurs connectés. */
  readonly auth?: boolean;
}

/**
 * Destinations principales, dans l'ordre d'affichage. Source unique de vérité pour
 * l'en-tête (desktop) et la barre d'onglets (mobile) — pas de duplication.
 * « Mes listes » vit dans la bibliothèque et « Statistiques » dans le menu profil :
 * la navigation de premier niveau reste courte (mobile-first).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Accueil", short: "Accueil", icon: Home, exact: true },
  { to: "/search", label: "Rechercher", short: "Recherche", icon: Search },
  { to: "/library", label: "Ma bibliothèque", short: "Biblio", icon: Clapperboard, auth: true },
];
