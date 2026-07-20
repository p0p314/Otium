/**
 * Value object ISBN (règles pures, sans I/O). Sert à deux choses : reconnaître qu'une
 * recherche saisie est un ISBN (bascule en recherche exacte) et rapprocher deux fiches
 * issues de sources différentes (clé de déduplication la plus fiable — ADR-0016).
 */

/** Retire tirets, espaces et normalise la casse du `X` final d'un ISBN-10. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  // Somme pondérée 10..1, le caractère de contrôle `X` valant 10 (norme ISO 2108).
  const sum = [...value].reduce((acc, char, index) => {
    const digit = char === "X" ? 10 : Number(char);
    return acc + digit * (10 - index);
  }, 0);
  return sum % 11 === 0;
}

function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  // Poids alternés 1/3, contrôle sur modulo 10 (norme EAN-13).
  const sum = [...value].reduce(
    (acc, char, index) => acc + Number(char) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return sum % 10 === 0;
}

/** Vrai si la chaîne est un ISBN-10 ou ISBN-13 **valide** (clé de contrôle vérifiée). */
export function isIsbn(raw: string): boolean {
  const value = normalizeIsbn(raw);
  return isValidIsbn10(value) || isValidIsbn13(value);
}

/**
 * Extrait l'ISBN d'une saisie utilisateur, ou `null` si ce n'en est pas un. Un titre qui
 * ressemble à une suite de chiffres sans clé de contrôle valide n'est **pas** traité
 * comme un ISBN : on évite de transformer une recherche textuelle en lookup vide.
 */
export function parseIsbn(query: string): string | null {
  const value = normalizeIsbn(query.trim());
  return isIsbn(value) ? value : null;
}
