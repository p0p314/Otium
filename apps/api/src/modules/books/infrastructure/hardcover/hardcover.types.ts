/**
 * Formes brutes de l'API Hardcover, réduites aux champs consommés.
 *
 * ⚠️ **API en bêta** : le schéma peut changer sans préavis. Tout y est optionnel et
 * l'adapter tolère l'absence de chaque champ — un changement de forme doit dégrader le
 * classement, jamais faire échouer l'application.
 *
 * Référence : https://docs.hardcover.app/api/getting-started/
 */

export interface HardcoverImage {
  readonly url?: string;
}

export interface HardcoverContribution {
  readonly author?: { readonly name?: string };
}

export interface HardcoverBook {
  readonly id?: number;
  readonly slug?: string;
  readonly title?: string;
  readonly description?: string;
  readonly pages?: number;
  readonly release_date?: string;
  readonly image?: HardcoverImage;
  readonly cached_image?: HardcoverImage;
  readonly contributions?: HardcoverContribution[];
  /** Note moyenne sur 5 (échelle Hardcover). */
  readonly rating?: number;
  readonly ratings_count?: number;
  /** Signaux de popularité — voir `hardcover.mapper` pour leur usage. */
  readonly users_count?: number;
  readonly users_read_count?: number;
}

export interface HardcoverBooksResponse {
  readonly data?: { readonly books?: HardcoverBook[] };
  readonly errors?: { readonly message?: string }[];
}
