import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  EPISODE_REVIEW_REPOSITORY,
  type EpisodeReview,
  type EpisodeReviewRepository,
  SERIES_TRACKING_REPOSITORY,
  type SeriesTrackingRepository,
} from "../domain";

export interface SaveEpisodeReviewInput {
  readonly rating: number | null;
  readonly body: string | null;
}

/**
 * Vérifie que l'épisode appartient bien à la série de l'élément de bibliothèque de
 * l'utilisateur (autorisation) avant toute lecture/écriture de note ou d'avis.
 */
async function assertEpisodeOfItem(
  tracking: SeriesTrackingRepository,
  userId: string,
  itemId: string,
  episodeId: string,
): Promise<void> {
  const ctx = await tracking.getContext(userId, itemId);
  if (!ctx || !(await tracking.isEpisodeOfMedia(ctx.mediaId, episodeId))) {
    throw new NotFoundException("Épisode introuvable pour cette série.");
  }
}

@Injectable()
export class GetEpisodeReviewUseCase {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly tracking: SeriesTrackingRepository,
    @Inject(EPISODE_REVIEW_REPOSITORY) private readonly reviews: EpisodeReviewRepository,
  ) {}

  async execute(userId: string, itemId: string, episodeId: string): Promise<EpisodeReview | null> {
    await assertEpisodeOfItem(this.tracking, userId, itemId, episodeId);
    return this.reviews.get(userId, episodeId);
  }
}

@Injectable()
export class SaveEpisodeReviewUseCase {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly tracking: SeriesTrackingRepository,
    @Inject(EPISODE_REVIEW_REPOSITORY) private readonly reviews: EpisodeReviewRepository,
  ) {}

  /** Enregistre note et/ou avis. Si les deux sont vides → suppression (renvoie null). */
  async execute(
    userId: string,
    itemId: string,
    episodeId: string,
    input: SaveEpisodeReviewInput,
  ): Promise<EpisodeReview | null> {
    await assertEpisodeOfItem(this.tracking, userId, itemId, episodeId);
    const trimmed = input.body?.trim() ?? null;
    const body = trimmed && trimmed.length > 0 ? trimmed : null;
    if (input.rating === null && body === null) {
      await this.reviews.delete(userId, episodeId);
      return null;
    }
    return this.reviews.save(userId, episodeId, { rating: input.rating, body });
  }
}

@Injectable()
export class DeleteEpisodeReviewUseCase {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly tracking: SeriesTrackingRepository,
    @Inject(EPISODE_REVIEW_REPOSITORY) private readonly reviews: EpisodeReviewRepository,
  ) {}

  async execute(userId: string, itemId: string, episodeId: string): Promise<void> {
    await assertEpisodeOfItem(this.tracking, userId, itemId, episodeId);
    await this.reviews.delete(userId, episodeId);
  }
}
