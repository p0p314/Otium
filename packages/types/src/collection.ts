import { z } from "zod";
import { WatchStatus } from "./media.js";

/** Un volume d'une œuvre, du point de vue de l'utilisateur. */
export const CollectionVolume = z.object({
  /** Identifiant de bibliothèque, `null` si le volume n'a pas été ajouté. */
  itemId: z.string().nullable(),
  externalId: z.string(),
  title: z.string(),
  posterUrl: z.string().url().nullable(),
  /** Rang dans l'œuvre, `null` pour un hors-série. */
  position: z.number().int().positive().nullable(),
  /** Statut de suivi, `null` si le volume n'est pas en bibliothèque. */
  status: WatchStatus.nullable(),
});
export type CollectionVolume = z.infer<typeof CollectionVolume>;

/**
 * Synthèse de l'avancement sur une œuvre. Le pourcentage se rapporte aux volumes
 * **connus** : on ne prétend pas connaître le total réel d'une série en cours de
 * publication.
 */
export const CollectionProgress = z.object({
  totalVolumes: z.number().int().nonnegative(),
  ownedVolumes: z.number().int().nonnegative(),
  readVolumes: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  lastRead: CollectionVolume.nullable(),
  nextSuggested: CollectionVolume.nullable(),
});
export type CollectionProgress = z.infer<typeof CollectionProgress>;

/** Fiche de suivi d'une œuvre (série de tomes, cycle de romans). */
export const CollectionTracking = z.object({
  provider: z.string(),
  externalId: z.string(),
  title: z.string(),
  volumes: z.array(CollectionVolume),
  progress: CollectionProgress,
});
export type CollectionTracking = z.infer<typeof CollectionTracking>;
