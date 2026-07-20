import { z } from "zod";

/**
 * Identifiants d'un livre chez les différentes sources. Un livre est identifié de façon
 * stable par son ISBN-13 quand il existe ; les identifiants de fournisseurs restent
 * exposés pour l'affichage (lien Google Books) et la traçabilité de la fusion (ADR-0016).
 */
export const BookIdentifiers = z.object({
  isbn10: z.string().nullable(),
  isbn13: z.string().nullable(),
  googleBooksId: z.string().nullable(),
  /** Clé Open Library, ex. `/works/OL45804W`. */
  openLibraryId: z.string().nullable(),
});
export type BookIdentifiers = z.infer<typeof BookIdentifiers>;

/**
 * Œuvre dont un volume fait partie : c'est ce qui permettra d'afficher **une** fiche
 * « One Piece » plutôt que 111 tomes indépendants. `position` est le rang du volume,
 * absent pour un hors-série.
 */
export const BookCollectionRef = z.object({
  id: z.string(),
  provider: z.string(),
  position: z.number().int().positive().nullable(),
});
export type BookCollectionRef = z.infer<typeof BookCollectionRef>;

/**
 * Données propres à un livre, en **complément** des champs communs de `MediaDetails`
 * (titre, couverture, description, genres, note moyenne… restent au niveau `Media`,
 * conformément à ADR-0003). N'y figure que ce qui n'a pas d'équivalent générique.
 */
export const BookDetails = z.object({
  subtitle: z.string().nullable(),
  authors: z.array(z.string()),
  publisher: z.string().nullable(),
  /** Date de publication telle que fournie (`YYYY`, `YYYY-MM` ou `YYYY-MM-DD`). */
  publishedDate: z.string().nullable(),
  pageCount: z.number().int().positive().nullable(),
  /** Code langue ISO 639-1, ex. `fr`. */
  language: z.string().nullable(),
  identifiers: BookIdentifiers,
  /** Fiche publique chez le fournisseur (lien « Voir sur Google Books »). */
  infoUrl: z.string().url().nullable(),
  /** Aperçu (extrait lisible) proposé par le fournisseur. */
  previewUrl: z.string().url().nullable(),
  /** Sources ayant contribué à la fiche, dans l'ordre de priorité (traçabilité). */
  sources: z.array(z.string()),
  /** Œuvre dont ce volume fait partie (`null` pour un livre isolé). */
  collection: BookCollectionRef.nullable(),
});
export type BookDetails = z.infer<typeof BookDetails>;
