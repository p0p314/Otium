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
  /** Date de diffusion, ou null si inconnue (alors considérée « sortie »). */
  readonly airDate: Date | null;
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

/**
 * Un épisode est **sorti** si sa date de diffusion est passée. Une date inconnue
 * (`null`) est considérée comme sortie : mieux vaut la proposer que la masquer.
 */
export function isAired(episode: EpisodeRef, now: Date): boolean {
  return episode.airDate === null || episode.airDate.getTime() <= now.getTime();
}

/** Nombre d'épisodes déjà sortis. */
export function airedCount(seasons: readonly SeasonRef[], now: Date): number {
  return orderedEpisodes(seasons).filter((e) => isAired(e, now)).length;
}

/** Premier épisode **sorti et non vu** dans l'ordre (reprise), ou `null`. */
export function nextUnwatchedAired(
  seasons: readonly SeasonRef[],
  watched: ReadonlySet<string>,
  now: Date,
): EpisodeRef | null {
  return orderedEpisodes(seasons).find((e) => !watched.has(e.id) && isAired(e, now)) ?? null;
}

/** Vrai s'il reste au moins un épisode **sorti** non vu. */
export function hasUnwatchedAired(
  seasons: readonly SeasonRef[],
  watched: ReadonlySet<string>,
  now: Date,
): boolean {
  return nextUnwatchedAired(seasons, watched, now) !== null;
}

/**
 * Premier épisode (numéro le plus bas) de la **dernière saison entamée en diffusion**
 * (plus grand numéro de saison ayant au moins un épisode sorti), ou `null`. Sert à
 * détecter le lancement d'une nouvelle saison.
 */
export function currentSeasonPremiere(
  seasons: readonly SeasonRef[],
  now: Date,
): EpisodeRef | null {
  const latestAiredSeason = [...seasons]
    .filter((s) => s.episodes.some((e) => isAired(e, now)))
    .sort((a, b) => b.number - a.number)[0];
  if (!latestAiredSeason) return null;
  return [...latestAiredSeason.episodes].sort((a, b) => a.number - b.number)[0] ?? null;
}

/**
 * Vrai si la saison en cours vient d'être lancée : le premier épisode de la dernière
 * saison diffusée est sorti il y a **moins de `withinDays` jours** (date connue requise —
 * une diffusion inconnue ne compte pas comme une sortie récente).
 */
export function hasRecentSeasonPremiere(
  seasons: readonly SeasonRef[],
  now: Date,
  withinDays: number,
): boolean {
  const premiere = currentSeasonPremiere(seasons, now);
  if (!premiere || premiere.airDate === null) return false;
  const ageDays = (now.getTime() - premiere.airDate.getTime()) / (24 * 60 * 60 * 1000);
  return ageDays >= 0 && ageDays < withinDays;
}

/** Épisodes **à venir** (diffusion future connue), triés par date croissante. */
export function upcomingEpisodes(seasons: readonly SeasonRef[], now: Date): EpisodeRef[] {
  return orderedEpisodes(seasons)
    .filter((e) => e.airDate !== null && e.airDate.getTime() > now.getTime())
    .sort((a, b) => (a.airDate as Date).getTime() - (b.airDate as Date).getTime());
}
