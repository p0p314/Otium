import {
  DEFAULT_PREFERENCES,
  type EpisodeCandidate,
  type MovieCandidate,
  type NotificationContent,
  type PlannedNotification,
  type UserPreferences,
} from "./models/notification";

/** Un jour, en millisecondes. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Anticipation du rappel de sortie d'un film (« plus qu'une semaine »). */
export const MOVIE_REMINDER_DAYS = 7;

export interface PlanningInput {
  readonly episodes: readonly EpisodeCandidate[];
  readonly movies: readonly MovieCandidate[];
  /** Préférences par utilisateur ; l'absence d'entrée vaut {@link DEFAULT_PREFERENCES}. */
  readonly preferences: ReadonlyMap<string, UserPreferences>;
  readonly now: Date;
}

/**
 * Transforme les candidats (épisodes récemment diffusés, films en fenêtre de sortie) en
 * notifications à envoyer — **fonction pure**, cœur testable du système (ADR-0020).
 *
 * Règles :
 * - Le **premier épisode d'une saison ≥ 2** est une notification de *nouvelle saison*
 *   (et non de nouvel épisode) : on n'envoie jamais les deux pour la même première.
 * - Un film **déjà sorti** (dans la fenêtre récente) déclenche la *sortie du jour* ; sinon,
 *   s'il sort dans sept jours ou moins, le *rappel J-7*. Les deux clés anti-doublon sont
 *   distinctes : un même film peut donc recevoir le rappel puis la sortie, une fois chacun.
 * - Chaque canal est filtré par les **préférences** de l'utilisateur.
 *
 * La sortie est dédoublonnée par `(userId, dedupKey)` : deux candidats convergents ne
 * produisent qu'une notification.
 */
export function planNotifications(input: PlanningInput): PlannedNotification[] {
  const planned: PlannedNotification[] = [];
  const seen = new Set<string>();

  const push = (n: PlannedNotification): void => {
    const composite = `${n.userId}::${n.dedupKey}`;
    if (seen.has(composite)) return;
    seen.add(composite);
    planned.push(n);
  };

  const prefsOf = (userId: string): UserPreferences =>
    input.preferences.get(userId) ?? DEFAULT_PREFERENCES;

  for (const episode of input.episodes) {
    const prefs = prefsOf(episode.userId);
    const isSeasonPremiere = episode.episodeNumber === 1 && episode.seasonNumber > 1;

    if (isSeasonPremiere) {
      if (!prefs.newSeasons) continue;
      push({
        userId: episode.userId,
        dedupKey: `SEASON:${episode.mediaId}:${episode.seasonNumber}`,
        type: "season",
        content: seriesContent(episode, "season"),
      });
    } else {
      if (!prefs.newEpisodes) continue;
      push({
        userId: episode.userId,
        dedupKey: `EPISODE:${episode.episodeId}`,
        type: "episode",
        content: seriesContent(episode, "episode"),
      });
    }
  }

  for (const movie of input.movies) {
    const prefs = prefsOf(movie.userId);
    const diffMs = movie.releaseDate.getTime() - input.now.getTime();

    if (diffMs <= 0) {
      if (!prefs.movieRelease) continue;
      push({
        userId: movie.userId,
        dedupKey: `MOVIE_RELEASE:${movie.mediaId}`,
        type: "movie_release",
        content: movieContent(movie, "movie_release", 0),
      });
      continue;
    }

    const days = Math.ceil(diffMs / DAY_MS);
    if (days > MOVIE_REMINDER_DAYS) continue; // hors fenêtre de rappel — ignoré.
    if (!prefs.movieReminder) continue;
    push({
      userId: movie.userId,
      dedupKey: `MOVIE_REMINDER:${movie.mediaId}`,
      type: "movie_reminder",
      content: movieContent(movie, "movie_reminder", days),
    });
  }

  return planned;
}

/** Charge utile d'une notification de série (épisode ou nouvelle saison). */
function seriesContent(
  episode: EpisodeCandidate,
  type: "episode" | "season",
): NotificationContent {
  const base = {
    contentId: episode.mediaId,
    provider: episode.provider,
    providerId: episode.externalId,
    image: episode.posterUrl,
    url: `/media/SERIES/${episode.externalId}`,
  };
  if (type === "season") {
    return {
      ...base,
      type,
      title: "Nouvelle saison disponible !",
      body: `${episode.seriesTitle} — Saison ${episode.seasonNumber} commence aujourd'hui.`,
    };
  }
  return {
    ...base,
    type,
    title: "Nouvel épisode disponible !",
    body: `${episode.seriesTitle} — Saison ${episode.seasonNumber}, épisode ${episode.episodeNumber} est maintenant disponible.`,
  };
}

/** Charge utile d'une notification de film (rappel J-7 ou sortie du jour). */
function movieContent(
  movie: MovieCandidate,
  type: "movie_reminder" | "movie_release",
  days: number,
): NotificationContent {
  const base = {
    contentId: movie.mediaId,
    provider: movie.provider,
    providerId: movie.externalId,
    image: movie.posterUrl,
    url: `/media/MOVIE/${movie.externalId}`,
  };
  if (type === "movie_release") {
    return {
      ...base,
      type,
      title: "Disponible aujourd'hui !",
      body: `${movie.title} est officiellement sorti.`,
    };
  }
  return {
    ...base,
    type,
    title: "Plus qu'une semaine !",
    body: `${movie.title} sort dans ${days} jour${days > 1 ? "s" : ""}.`,
  };
}
