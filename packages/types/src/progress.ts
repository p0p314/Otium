import { z } from "zod";

/**
 * Unité de progression d'un média (ADR-0017). Enum **fermé mais extensible** : ajouter
 * `CHAPTERS`, `VOLUMES` ou `MINUTES` plus tard = ajouter une valeur, sans toucher au
 * modèle ni aux écrans existants.
 */
export const ProgressUnit = z.enum(["PAGES", "PERCENT"]);
export type ProgressUnit = z.infer<typeof ProgressUnit>;

/**
 * Progression d'un utilisateur sur un média. Générique par construction : un livre suivi
 * en pages et un futur manga suivi en chapitres partagent cette forme. Les valeurs
 * dérivées (`percent`, `remaining`) sont calculées côté serveur — un seul calcul, pas de
 * divergence entre clients.
 */
export const MediaProgress = z.object({
  unit: ProgressUnit,
  /** Avancement courant, exprimé dans `unit`. */
  value: z.number().int().nonnegative(),
  /** Total connu (nombre de pages ; 100 pour un pourcentage). Null si inconnu. */
  total: z.number().int().positive().nullable(),
  /** Pourcentage lu (0–100), null si le total est inconnu. */
  percent: z.number().min(0).max(100).nullable(),
  /** Unités restantes (pages…), null si le total est inconnu. */
  remaining: z.number().int().nonnegative().nullable(),
  updatedAt: z.string().datetime(),
});
export type MediaProgress = z.infer<typeof MediaProgress>;

/**
 * Mise à jour de progression. `total` est optionnel : il n'est transmis que lorsque le
 * catalogue ne connaît pas le nombre de pages et que l'utilisateur le renseigne lui-même.
 */
export const UpdateProgressInput = z.object({
  unit: ProgressUnit,
  value: z.number().int().nonnegative(),
  total: z.number().int().positive().nullable().optional(),
});
export type UpdateProgressInput = z.infer<typeof UpdateProgressInput>;
