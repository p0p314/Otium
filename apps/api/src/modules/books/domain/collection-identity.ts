/**
 * Identité d'une œuvre — **source unique**.
 *
 * Cette identité est construite à deux moments qui ne se croisent jamais : au
 * regroupement des résultats de recherche, et à l'ajout d'un volume en bibliothèque. Tant
 * que chacun la fabriquait de son côté, les deux ont divergé — la recherche pointait vers
 * `books / series:google-books:XnfZ…`, la base enregistrait `google-books / XnfZ…`, et
 * aucune fiche d'œuvre ne se retrouvait. Les deux passent désormais par ici.
 */

/** Fournisseur sous lequel les livres — et leurs œuvres — sont référencés dans Otium. */
export const BOOKS_PROVIDER = "books";

/**
 * Clé d'une œuvre connue du fournisseur. La source est incluse : deux fournisseurs
 * peuvent employer le même identifiant de série sans désigner la même œuvre.
 */
export function providerSeriesKey(source: string, seriesId: string): string {
  return `series:${source}:${seriesId}`;
}

/**
 * Clé d'une œuvre déduite du titre et de l'auteur. Le préfixe distinct empêche qu'une
 * œuvre reconnue par le titre soit confondue avec une œuvre déclarée par le fournisseur —
 * rien ne garantit qu'elles désignent la même chose.
 */
export function titleSeriesGroupKey(titleAndAuthorKey: string): string {
  return `title:${titleAndAuthorKey}`;
}
