import { Inject, Injectable } from "@nestjs/common";
import type { UpcomingDashboard } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import {
  LIBRARY_REPOSITORY,
  type LibraryRepository,
  SERIES_TRACKING_REPOSITORY,
  type SeriesTrackingRepository,
} from "../domain";
import { RefreshTrackedSeriesUseCase } from "./refresh-tracked-series.usecase";
import { buildUpcoming } from "./upcoming.view";

/**
 * Agenda « À venir » : épisodes à diffusion future des séries suivies **et** sorties
 * futures des films de la bibliothèque. Lecture seule ; assemblage pur cloisonné par
 * type de média délégué à {@link buildUpcoming}. Rafraîchit au préalable la structure
 * des séries périmées (garde-fou de fraîcheur) pour capter les épisodes nouvellement datés.
 */
@Injectable()
export class GetUpcomingUseCase implements UseCase<string, UpcomingDashboard> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly tracking: SeriesTrackingRepository,
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    private readonly refresh: RefreshTrackedSeriesUseCase,
  ) {}

  async execute(userId: string): Promise<UpcomingDashboard> {
    await this.refresh.execute(userId);
    const now = new Date();
    const [series, movies] = await Promise.all([
      this.tracking.listTrackedSeries(userId),
      this.library.listUpcomingMovies(userId, now),
    ]);
    return buildUpcoming(series, movies, now);
  }
}
