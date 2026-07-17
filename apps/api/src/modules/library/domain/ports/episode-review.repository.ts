/** Note (0–10) et/ou avis d'un utilisateur sur un épisode. Les deux champs sont optionnels. */
export interface EpisodeReview {
  readonly rating: number | null;
  readonly body: string | null;
  readonly updatedAt: Date;
}

/**
 * Port de persistance des notes/avis d'épisodes (un par utilisateur et par épisode).
 * Distinct des avis de média (ADR-0011) : l'unité est ici l'épisode, pas le média.
 */
export interface EpisodeReviewRepository {
  get(userId: string, episodeId: string): Promise<EpisodeReview | null>;
  save(
    userId: string,
    episodeId: string,
    input: { rating: number | null; body: string | null },
  ): Promise<EpisodeReview>;
  delete(userId: string, episodeId: string): Promise<void>;
}

export const EPISODE_REVIEW_REPOSITORY = Symbol("EPISODE_REVIEW_REPOSITORY");
