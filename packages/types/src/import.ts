import { z } from "zod";
import { MediaType } from "./media.js";

/** Formats d'import pris en charge (extensible : d'autres sources plus tard). */
export const ImportSourceFormat = z.enum(["tvtime"]);
export type ImportSourceFormat = z.infer<typeof ImportSourceFormat>;

/** Un média que le rapprochement au catalogue n'a pas pu identifier. */
export const UnmatchedImportEntry = z.object({
  type: MediaType,
  title: z.string(),
  year: z.number().int().nullable(),
});
export type UnmatchedImportEntry = z.infer<typeof UnmatchedImportEntry>;

/** Compteurs d'un type de média (film ou série) dans le rapport d'import. */
export const ImportMediaCounters = z.object({
  /** Entrées lues dans l'export pour ce type. */
  parsed: z.number().int().nonnegative(),
  /** Entrées rapprochées au catalogue (TMDB) puis importées. */
  imported: z.number().int().nonnegative(),
  /** Entrées déjà présentes dans la bibliothèque (rafraîchies, dédoublonnage). */
  skipped: z.number().int().nonnegative(),
  /** Entrées ambiguës (candidats trouvés mais aucun certain) à résoudre manuellement. */
  pending: z.number().int().nonnegative(),
  /** Entrées sans aucun candidat au catalogue. */
  unmatched: z.number().int().nonnegative(),
});
export type ImportMediaCounters = z.infer<typeof ImportMediaCounters>;

/** Statut de suivi visé pour une entrée importée. */
export const ImportEntryStatus = z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "DROPPED"]);
export type ImportEntryStatus = z.infer<typeof ImportEntryStatus>;

/** Un épisode vu d'une entrée importée (numérotation d'origine + date réelle si connue). */
export const ImportWatchedEpisode = z.object({
  seasonNumber: z.number().int(),
  episodeNumber: z.number().int(),
  watchedAt: z.string().datetime().nullable(),
});
export type ImportWatchedEpisode = z.infer<typeof ImportWatchedEpisode>;

/** Un candidat du catalogue proposé pour résoudre une entrée ambiguë. */
export const ImportCandidate = z.object({
  externalId: z.string(),
  title: z.string(),
  year: z.number().int().nullable(),
  posterUrl: z.string().url().nullable(),
});
export type ImportCandidate = z.infer<typeof ImportCandidate>;

/**
 * Une entrée d'import **ambiguë** : le rapprochement automatique n'a pas tranché, mais des
 * candidats existent. Le client conserve l'entrée telle quelle et la renvoie avec le choix
 * de l'utilisateur ({@link ResolveImportInput}).
 */
export const PendingImport = z.object({
  type: MediaType,
  title: z.string(),
  year: z.number().int().nullable(),
  status: ImportEntryStatus,
  watchedEpisodes: z.array(ImportWatchedEpisode),
  candidates: z.array(ImportCandidate),
});
export type PendingImport = z.infer<typeof PendingImport>;

/** Résolution manuelle d'une entrée ambiguë : le candidat choisi + l'entrée d'origine. */
export const ResolveImportInput = z.object({
  candidate: ImportCandidate,
  entry: z.object({
    type: MediaType,
    title: z.string(),
    year: z.number().int().nullable(),
    status: ImportEntryStatus,
    watchedEpisodes: z.array(ImportWatchedEpisode),
  }),
});
export type ResolveImportInput = z.infer<typeof ResolveImportInput>;

/** Résultat d'une résolution : importée (ou déjà présente) et épisodes marqués. */
export const ResolveImportResult = z.object({
  imported: z.boolean(),
  episodesMarked: z.number().int().nonnegative(),
});
export type ResolveImportResult = z.infer<typeof ResolveImportResult>;

/**
 * Progression d'un import en cours. `total` est connu après lecture de l'archive
 * (0 tant que la préparation n'est pas finie) ; `processed` avance entrée par entrée.
 */
export const ImportProgress = z.object({
  total: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  imported: z.number().int().nonnegative(),
  episodesMarked: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  unmatched: z.number().int().nonnegative(),
});
export type ImportProgress = z.infer<typeof ImportProgress>;

/** État d'un job d'import : en cours, terminé (rapport dispo) ou en erreur. */
export const ImportJobStatus = z.enum(["running", "done", "error"]);
export type ImportJobStatus = z.infer<typeof ImportJobStatus>;

/** Réponse au lancement d'un import : identifiant de job à interroger pour la progression. */
export const StartImportResult = z.object({ jobId: z.string() });
export type StartImportResult = z.infer<typeof StartImportResult>;

/** Rapport d'un import : ce qui a été lu, rapproché, importé, ignoré, non trouvé, à résoudre. */
export const ImportReport = z.object({
  source: ImportSourceFormat,
  movies: ImportMediaCounters,
  series: ImportMediaCounters,
  /** Nombre total d'épisodes marqués vus (séries). */
  episodesMarked: z.number().int().nonnegative(),
  /** Échantillon des médias sans aucun candidat (borné pour l'affichage). */
  unmatchedSample: z.array(UnmatchedImportEntry),
  /** Entrées ambiguës à résoudre à la main (candidats fournis, bornées). */
  pending: z.array(PendingImport),
});
export type ImportReport = z.infer<typeof ImportReport>;

/**
 * État complet d'un job d'import interrogé par le client (polling). Le `report` n'est
 * disponible qu'une fois `status: "done"` ; `error` est renseigné si `status: "error"`.
 */
export const ImportJobState = z.object({
  id: z.string(),
  status: ImportJobStatus,
  progress: ImportProgress,
  report: ImportReport.nullable(),
  error: z.string().nullable(),
});
export type ImportJobState = z.infer<typeof ImportJobState>;
