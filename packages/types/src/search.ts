import { z } from "zod";
import { ExternalRef, MediaSummary, MediaType } from "./media.js";

/**
 * Liste de types transmise en query string sous forme `types=MOVIE,BOOK`. Ajout
 * **rétro-compatible** : `type` (singulier) reste accepté et les clients existants
 * fonctionnent sans changement (CLAUDE.md §5).
 */
const MediaTypeList = z
  .union([z.string(), z.array(MediaType)])
  .transform((value) => (typeof value === "string" ? value.split(",") : value))
  .pipe(z.array(MediaType).min(1));

export const SearchMediaQuery = z.object({
  q: z.string().min(1).max(200),
  type: MediaType.optional(),
  /** Sélection multi-types (prioritaire sur `type`), ex. films + livres. */
  types: MediaTypeList.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type SearchMediaQuery = z.infer<typeof SearchMediaQuery>;

export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  });

/**
 * Œuvre reconstituée à partir des volumes trouvés (série de tomes, cycle de romans) :
 * une entrée unique au lieu de N volumes.
 */
export const CollectionSummary = z.object({
  externalRef: ExternalRef,
  title: z.string(),
  coverUrl: z.string().url().nullable(),
  authors: z.array(z.string()),
  /** Nombre de volumes **trouvés**, pas le total réel de l'œuvre (souvent plus grand). */
  volumeCount: z.number().int().positive(),
  /** Rangs connus, pour situer l'étendue trouvée sans charger les volumes. */
  positions: z.array(z.number().int().positive()),
  volumes: z.array(MediaSummary),
});
export type CollectionSummary = z.infer<typeof CollectionSummary>;

/**
 * Résultats de recherche. `collections` est **additif** : les clients qui l'ignorent
 * conservent exactement le comportement antérieur, et les volumes regroupés sont
 * simplement absents d'`items` (ils vivent dans leur œuvre).
 */
export const SearchMediaResult = Paginated(MediaSummary).extend({
  collections: z.array(CollectionSummary).optional(),
});
export type SearchMediaResult = z.infer<typeof SearchMediaResult>;

/** Tendances du moment (films/séries), pour la mise en avant sous la recherche. */
export const TrendingMediaQuery = z.object({
  type: MediaType.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type TrendingMediaQuery = z.infer<typeof TrendingMediaQuery>;
