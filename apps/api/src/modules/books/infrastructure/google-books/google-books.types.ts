/**
 * Formes brutes de l'API Google Books, réduites aux champs consommés. Tout est optionnel :
 * l'API omet librement des propriétés selon les volumes.
 * Référence : https://developers.google.com/books/docs/v1/reference/volumes
 */

export interface GoogleIndustryIdentifier {
  readonly type?: string;
  readonly identifier?: string;
}

export interface GoogleImageLinks {
  readonly smallThumbnail?: string;
  readonly thumbnail?: string;
  readonly small?: string;
  readonly medium?: string;
  readonly large?: string;
  readonly extraLarge?: string;
}

export interface GoogleVolumeInfo {
  readonly title?: string;
  readonly subtitle?: string;
  readonly authors?: string[];
  readonly publisher?: string;
  readonly publishedDate?: string;
  readonly description?: string;
  readonly industryIdentifiers?: GoogleIndustryIdentifier[];
  readonly pageCount?: number;
  readonly categories?: string[];
  /** Note moyenne sur 5 (échelle Google). */
  readonly averageRating?: number;
  readonly ratingsCount?: number;
  readonly imageLinks?: GoogleImageLinks;
  readonly language?: string;
  readonly infoLink?: string;
  readonly previewLink?: string;
}

export interface GoogleAccessInfo {
  /** `NONE`, `PARTIAL` ou `ALL_PAGES` : un aperçu n'existe qu'au-delà de `NONE`. */
  readonly viewability?: string;
}

export interface GoogleVolume {
  readonly id?: string;
  readonly volumeInfo?: GoogleVolumeInfo;
  readonly accessInfo?: GoogleAccessInfo;
}

export interface GoogleVolumesResponse {
  readonly totalItems?: number;
  readonly items?: GoogleVolume[];
}
