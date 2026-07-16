/**
 * Rapprochement d'un titre importé (nom + année) avec les candidats du catalogue.
 * **Pur**, testable sans I/O : la recherche réseau vit en infrastructure, la
 * *sélection* du meilleur candidat est ici, déterministe et couverte par les tests.
 */
export interface MatchCandidate {
  readonly externalId: string;
  readonly title: string;
  /** Titre en langue d'origine, si différent du titre localisé (aide au rapprochement). */
  readonly originalTitle?: string | null;
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

/**
 * Extrait une année (1900–2099) d'un titre — entre parenthèses « Titre (2014) » ou en
 * suffixe « Titre 2014 » — et renvoie le titre nettoyé. Certaines sources encodent la date
 * dans le titre, ce qui empêche le rapprochement : on la retire de la requête et on s'en sert
 * comme signal d'année. Une année seule (« 1984 ») est conservée comme titre.
 */
export function extractTitleYear(title: string): { title: string; year: number | null } {
  const match = title.match(/^(.+?)\s*[([]?\s*((?:19|20)\d{2})\s*[)\]]?\s*$/);
  if (!match) return { title: title.trim(), year: null };
  return { title: match[1]!.trim(), year: Number.parseInt(match[2]!, 10) };
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

/** Similarité titre pure (0..1) : identité normalisée = 1, sinon recouvrement de tokens. */
function titleSimilarity(query: string, candidate: string): number {
  return normalizeTitle(query) === normalizeTitle(candidate)
    ? 1
    : jaccard(tokenSet(query), tokenSet(candidate));
}

/**
 * Score de similarité entre une requête et un candidat (0..~1.15). On retient la meilleure
 * similarité entre le **titre localisé** et le **titre d'origine** du candidat : un import
 * en anglais (« The 100 ») se rapproche ainsi d'un catalogue localisé (« Les 100 ») via le
 * titre d'origine. L'année ajuste légèrement le score.
 */
export function scoreMatch(query: MatchQuery, candidate: MatchCandidate): number {
  let score = titleSimilarity(query.title, candidate.title);
  if (candidate.originalTitle) {
    score = Math.max(score, titleSimilarity(query.title, candidate.originalTitle));
  }

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
