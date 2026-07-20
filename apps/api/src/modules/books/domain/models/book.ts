/**
 * Modèle **normalisé** d'un livre, indépendant de toute source. Chaque fournisseur mappe
 * sa réponse vers cette forme ; la fusion et le reste du module ne manipulent qu'elle
 * (ADR-0004). Tout champ inconnu vaut `null` / tableau vide — jamais `undefined` : la
 * fusion distingue « absent » de « présent mais vide » sans ambiguïté.
 */
export interface BookRecord {
  /** Identifiant chez la source qui a produit cet enregistrement. */
  readonly externalId: string;
  readonly source: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly authors: readonly string[];
  readonly description: string | null;
  /** Couverture d'aperçu (listes, résultats de recherche). */
  readonly coverUrl: string | null;
  /** Couverture haute résolution (fiche détaillée). */
  readonly coverUrlLarge: string | null;
  readonly categories: readonly string[];
  /** Date de publication brute (`YYYY`, `YYYY-MM` ou `YYYY-MM-DD`). */
  readonly publishedDate: string | null;
  readonly pageCount: number | null;
  /** Code langue ISO 639-1, ex. `fr`. */
  readonly language: string | null;
  readonly publisher: string | null;
  readonly isbn10: string | null;
  readonly isbn13: string | null;
  readonly googleBooksId: string | null;
  readonly openLibraryId: string | null;
  readonly infoUrl: string | null;
  readonly previewUrl: string | null;
  /** Note moyenne normalisée sur 10 (les sources l'expriment souvent sur 5). */
  readonly averageRating: number | null;
  readonly ratingsCount: number | null;
  /** Sources ayant contribué, dans l'ordre de priorité (traçabilité de la fusion). */
  readonly sources: readonly string[];
}

/** Une page de résultats de recherche chez une source. */
export interface BookSearchPage {
  readonly items: readonly BookRecord[];
  readonly total: number;
}

/** Année de publication extraite d'une date partielle, ou `null` si illisible. */
export function publicationYear(publishedDate: string | null): number | null {
  if (!publishedDate) return null;
  const match = /^(\d{4})/.exec(publishedDate);
  return match?.[1] ? Number(match[1]) : null;
}
