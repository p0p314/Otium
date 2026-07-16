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

export interface ToggleEpisodesWatchedInput {
  userId: string;
  itemId: string;
  episodeIds: string[];
  watched: boolean;
}

/**
 * Marque/démarque **plusieurs** épisodes en une seule requête (saison complète,
 * série complète). Émet `EpisodeWatched` pour chaque épisode nouvellement vu puis,
 * le cas échéant, `SeriesCompleted`. Recalcule le statut une seule fois (éco-conception).
 */
@Injectable()
export class ToggleEpisodesWatchedUseCase implements UseCase<
  ToggleEpisodesWatchedInput,
  SeriesTrackingView
> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute({
    userId,
    itemId,
    episodeIds,
    watched,
  }: ToggleEpisodesWatchedInput): Promise<SeriesTrackingView> {
    const ctx = await this.repo.getContext(userId, itemId);
    if (!ctx) throw new NotFoundException("Série introuvable dans la bibliothèque.");

    const uniqueIds = [...new Set(episodeIds)];
    const validCount = await this.repo.countEpisodesOfMedia(ctx.mediaId, uniqueIds);
    if (validCount !== uniqueIds.length) {
      throw new NotFoundException("Un ou plusieurs épisodes n'appartiennent pas à cette série.");
    }

    const before = await this.repo.getWatchedEpisodeIds(itemId);
    await this.repo.setEpisodesWatched(itemId, uniqueIds, watched);

    if (watched) {
      const newlyWatched = uniqueIds.filter((id) => !before.has(id));
      await this.events.publishAll(
        newlyWatched.map((id) => new EpisodeWatched(userId, ctx.mediaId, id)),
      );
    }

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
