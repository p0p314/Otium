/**
 * Formes **indexables** des données que PostgreSQL ne sait pas indexer telles quelles.
 *
 * Vit au niveau partagé parce que plusieurs adapters Prisma écrivent les mêmes tables :
 * les faire dépendre l'un de l'autre coupleraient deux modules par leur infrastructure,
 * alors que dupliquer la règle la laisserait dériver — et une colonne dérivée
 * désynchronisée fait silencieusement disparaître des résultats de recherche.
 */

/**
 * Auteurs concaténés, tels que stockés dans `BookMetadata.authorsText`.
 *
 * Cette colonne existe parce que PostgreSQL refuse d'indexer
 * `array_to_string(authors, ' ')` : la fonction n'est pas marquée IMMUTABLE. C'est elle
 * que couvre l'index trigramme qui rend la recherche partielle par auteur rapide.
 */
export function authorsText(authors: readonly string[]): string | null {
  const joined = authors.join(" ").trim();
  return joined === "" ? null : joined;
}
