import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../media/domain";
import {
  SERIES_TRACKING_REPOSITORY,
  type SeriesTrackingRepository,
} from "../domain";
import { buildSeriesTrackingView, type SeriesTrackingView } from "./series-tracking.view";

export interface GetSeriesTrackingInput {
  userId: string;
  itemId: string;
}

/**
 * Retourne le suivi d'une série. Charge paresseusement la structure saisons/épisodes
 * depuis le fournisseur (puis la persiste) si elle n'est pas encore en base.
 */
@Injectable()
export class GetSeriesTrackingUseCase implements UseCase<GetSeriesTrackingInput, SeriesTrackingView> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
    @Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider,
  ) {}

  async execute({ userId, itemId }: GetSeriesTrackingInput): Promise<SeriesTrackingView> {
    const ctx = await this.repo.getContext(userId, itemId);
    if (!ctx) throw new NotFoundException("Série introuvable dans la bibliothèque.");

    if (!(await this.repo.hasEpisodes(ctx.mediaId))) {
      const details = await this.catalog.getSeriesDetails(ctx.externalId);
      await this.repo.saveSeasons(ctx.mediaId, details.seasons);
    }

    const [seasons, watched] = await Promise.all([
      this.repo.getSeasons(ctx.mediaId),
      this.repo.getWatchedEpisodeIds(itemId),
    ]);
    return buildSeriesTrackingView(itemId, ctx.title, ctx.status, seasons, watched);
  }
}
