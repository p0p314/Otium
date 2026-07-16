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
  /** Entrées déjà présentes dans la bibliothèque (ignorées, dédoublonnage). */
  skipped: z.number().int().nonnegative(),
  /** Entrées non rapprochées au catalogue (listées pour résolution manuelle). */
  unmatched: z.number().int().nonnegative(),
});
export type ImportMediaCounters = z.infer<typeof ImportMediaCounters>;

/** Rapport d'un import : ce qui a été lu, rapproché, importé, ignoré, non trouvé. */
export const ImportReport = z.object({
  source: ImportSourceFormat,
  movies: ImportMediaCounters,
  series: ImportMediaCounters,
  /** Nombre total d'épisodes marqués vus (séries). */
  episodesMarked: z.number().int().nonnegative(),
  /** Échantillon des médias non rapprochés (borné pour l'affichage). */
  unmatchedSample: z.array(UnmatchedImportEntry),
});
export type ImportReport = z.infer<typeof ImportReport>;
