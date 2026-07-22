import type { EpisodeCandidate, MovieCandidate } from "../models/notification";

/**
 * Port de lecture des **candidats** à notification. Ne renvoie **que** les contenus
 * susceptibles de déclencher une notification — épisodes fraîchement diffusés, films dont
 * la sortie approche ou vient d'avoir lieu — et **uniquement** pour les éléments de
 * bibliothèque « à voir »/« en cours » (jamais terminés, abandonnés ou retirés). Balayer
 * toute la bibliothèque de tous les utilisateurs est proscrit (éco-conception, ADR-0020).
 */
export interface NotificationCandidateRepository {
  /**
   * Épisodes de séries suivies dont la date de diffusion tombe dans `(since, until]`.
   * Bornage temporel = pas de rattrapage du back-catalogue à la première synchro.
   */
  findRecentlyAiredEpisodes(since: Date, until: Date): Promise<EpisodeCandidate[]>;
  /**
   * Films de la liste « à voir » dont la sortie est dans `[releasedSince, upcomingUntil]` —
   * fenêtre couvrant à la fois le rappel J-7 (futur proche) et la sortie du jour (passé récent).
   */
  findMoviesInReleaseWindow(releasedSince: Date, upcomingUntil: Date): Promise<MovieCandidate[]>;
}

export const NOTIFICATION_CANDIDATE_REPOSITORY = Symbol("NOTIFICATION_CANDIDATE_REPOSITORY");
