import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import {
  EpisodeWatched,
  isComplete,
  SeriesCompleted,
  SERIES_TRACKING_REPOSITORY,
  type SeriesTrackingRepository,
} from "../domain";
import { buildSeriesTrackingView, type SeriesTrackingView } from "./series-tracking.view";

export interface ToggleEpisodeWatchedInput {
  userId: string;
  itemId: string;
  episodeId: string;
  watched: boolean;
}

/**
 * Marque un épisode vu/non vu, met à jour le statut de la série (IN_PROGRESS/COMPLETED)
 * et émet `EpisodeWatched` puis, le cas échéant, `SeriesCompleted`.
 */
@Injectable()
export class ToggleEpisodeWatchedUseCase
  implements UseCase<ToggleEpisodeWatchedInput, SeriesTrackingView>
{
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute({
    userId,
    itemId,
    episodeId,
    watched,
  }: ToggleEpisodeWatchedInput): Promise<SeriesTrackingView> {
    const ctx = await this.repo.getContext(userId, itemId);
    if (!ctx) throw new NotFoundException("Série introuvable dans la bibliothèque.");
    if (!(await this.repo.isEpisodeOfMedia(ctx.mediaId, episodeId))) {
      throw new NotFoundException("Épisode introuvable pour cette série.");
    }

    await this.repo.setEpisodeWatched(itemId, episodeId, watched);
    if (watched) await this.events.publish(new EpisodeWatched(userId, ctx.mediaId, episodeId));

    const [seasons, watchedIds] = await Promise.all([
      this.repo.getSeasons(ctx.mediaId),
      this.repo.getWatchedEpisodeIds(itemId),
    ]);

    const complete = isComplete(seasons, watchedIds);
    const nextStatus = complete ? "COMPLETED" : watchedIds.size > 0 ? "IN_PROGRESS" : "PLANNED";
    if (nextStatus !== ctx.status) await this.repo.setStatus(itemId, nextStatus);
    if (complete && ctx.status !== "COMPLETED") {
      await this.events.publish(new SeriesCompleted(userId, ctx.mediaId));
    }

    return buildSeriesTrackingView(itemId, ctx.title, nextStatus, seasons, watchedIds);
  }
}
