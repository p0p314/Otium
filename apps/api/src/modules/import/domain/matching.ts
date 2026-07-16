/**
 * Rapprochement d'un titre importé (nom + année) avec les candidats du catalogue.
 * **Pur**, testable sans I/O : la recherche réseau vit en infrastructure, la
 * *sélection* du meilleur candidat est ici, déterministe et couverte par les tests.
 */
export interface MatchCandidate {
  readonly externalId: string;
  readonly title: string;
  readonly year: number | null;
}

export interface MatchQuery {
  readonly title: string;
  readonly year: number | null;
}

/** Score minimal pour accepter un rapprochement (évite les faux positifs). */
export const MATCH_THRESHOLD = 0.6;

/** Normalise un titre : minuscules, sans accents ni ponctuation, espaces compactés. */
export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeTitle(value).split(" ").filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Score de similarité entre une requête et un candidat (0..~1.15). Titre identique
 * = 1 ; sinon recouvrement de tokens (Jaccard). L'année ajuste légèrement le score.
 */
export function scoreMatch(query: MatchQuery, candidate: MatchCandidate): number {
  const nq = normalizeTitle(query.title);
  const nc = normalizeTitle(candidate.title);
  let score = nq === nc ? 1 : jaccard(tokenSet(query.title), tokenSet(candidate.title));

  if (query.year != null && candidate.year != null) {
    const diff = Math.abs(query.year - candidate.year);
    score += diff === 0 ? 0.15 : diff <= 1 ? 0.07 : -0.15;
  }
  return score;
}

/**
 * Meilleur candidat au-dessus du seuil, ou `null`. À score égal, garde le premier
 * (les fournisseurs renvoient déjà les résultats par pertinence décroissante).
 */
export function pickBestMatch(
  query: MatchQuery,
  candidates: readonly MatchCandidate[],
): MatchCandidate | null {
  let best: MatchCandidate | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = scoreMatch(query, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best && bestScore >= MATCH_THRESHOLD ? best : null;
}
