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

/** Une série à laquelle appartient le volume (identifiant stable côté Google). */
export interface GoogleVolumeSeries {
  readonly seriesId?: string;
  /** `COLLECTED_EDITION` (tomes reliés) ou `SERIAL` (chapitres). */
  readonly seriesBookType?: string;
  readonly orderNumber?: number;
}

/**
 * Informations de série. **Non documentées** dans la référence officielle, et surtout
 * **très inégalement renseignées** — mesuré sur des échantillons de 20 volumes :
 *
 * | Recherche      | Volumes portant `seriesInfo` |
 * | -------------- | ---------------------------- |
 * | One Piece      | 100 %                        |
 * | Naruto         | 10 %                         |
 * | Dune           | 0 %                          |
 * | roman policier | 0 %                          |
 *
 * Quand elles sont présentes, elles sont fiables : identifiant stable, rang correct, et
 * séparation nette entre édition reliée et parution en chapitres. Mais elles ne peuvent
 * pas, à elles seules, fonder le regroupement des tomes d'une œuvre : il faudra les
 * compléter par une reconnaissance de titre. Elles restent la source **prioritaire**,
 * parce qu'elles ne produisent aucun faux regroupement.
 */
export interface GoogleSeriesInfo {
  readonly shortSeriesBookTitle?: string;
  readonly bookDisplayNumber?: string;
  readonly volumeSeries?: GoogleVolumeSeries[];
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
  readonly seriesInfo?: GoogleSeriesInfo;
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
