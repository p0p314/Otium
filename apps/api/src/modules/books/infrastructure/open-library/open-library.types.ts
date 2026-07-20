/**
 * Formes brutes d'Open Library, réduites aux champs consommés.
 * Références : https://openlibrary.org/dev/docs/api/search et /dev/docs/api/books
 */

export interface OpenLibraryDoc {
  /** Clé d'œuvre, ex. `/works/OL45804W`. */
  readonly key?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly author_name?: string[];
  readonly first_publish_year?: number;
  readonly publisher?: string[];
  readonly number_of_pages_median?: number;
  readonly language?: string[];
  readonly isbn?: string[];
  /** Identifiant de couverture, à composer avec l'URL du service d'images. */
  readonly cover_i?: number;
  readonly subject?: string[];
  /** Résumé, présent seulement sur certaines réponses. */
  readonly first_sentence?: string[];
}

export interface OpenLibrarySearchResponse {
  readonly numFound?: number;
  readonly docs?: OpenLibraryDoc[];
}

/** Description d'une œuvre : Open Library alterne chaîne brute et objet typé. */
export type OpenLibraryDescription = string | { readonly value?: string };

export interface OpenLibraryWork {
  readonly key?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly description?: OpenLibraryDescription;
  readonly covers?: number[];
  readonly subjects?: string[];
}
