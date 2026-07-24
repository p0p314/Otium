/**
 * Requêtes **publiques** (catalogue, sans donnée personnelle) : seules autorisées à être
 * persistées sur disque (`localStorage`). Les données personnelles (bibliothèque, stats,
 * accueil, import…) ne sont **jamais** écrites sur disque — confidentialité sur poste partagé
 * et réduction de surface en cas de XSS (audit VULN-10).
 */
const PUBLIC_QUERY_KEYS = new Set(["media-search", "trending", "media-details", "episode-details"]);

/** Vrai si la requête peut être persistée (clé de catalogue publique). */
export function isPersistableQuery(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === "string" && PUBLIC_QUERY_KEYS.has(queryKey[0]);
}
