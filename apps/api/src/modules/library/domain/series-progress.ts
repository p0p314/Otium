/**
 * Logique de progression d'une série — **pure**, testable sans I/O.
 * C'est le cœur de la reprise automatique : `nextUnwatched` renvoie le premier
 * épisode non vu dans l'ordre (saison, numéro).
 */
export interface EpisodeRef {
  readonly id: string;
  readonly seasonNumber: number;
  readonly number: number;
  readonly title: string;
}

export interface SeasonRef {
  readonly number: number;
  readonly episodes: readonly EpisodeRef[];
}

/** Tous les épisodes, triés par (saison, numéro). */
export function orderedEpisodes(seasons: readonly SeasonRef[]): EpisodeRef[] {
  return [...seasons]
    .sort((a, b) => a.number - b.number)
    .flatMap((s) => [...s.episodes].sort((a, b) => a.number - b.number));
}

export function totalEpisodes(seasons: readonly SeasonRef[]): number {
  return seasons.reduce((sum, s) => sum + s.episodes.length, 0);
}

/** Premier épisode non vu dans l'ordre, ou `null` si la série est terminée. */
export function nextUnwatched(
  seasons: readonly SeasonRef[],
  watched: ReadonlySet<string>,
): EpisodeRef | null {
  return orderedEpisodes(seasons).find((e) => !watched.has(e.id)) ?? null;
}

/** Vrai si tous les épisodes (au moins un) sont vus. */
export function isComplete(seasons: readonly SeasonRef[], watched: ReadonlySet<string>): boolean {
  const total = totalEpisodes(seasons);
  return total > 0 && nextUnwatched(seasons, watched) === null;
}
