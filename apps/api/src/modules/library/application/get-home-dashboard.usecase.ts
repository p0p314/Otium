import { Inject, Injectable } from "@nestjs/common";
import type { HomeDashboard } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { SERIES_TRACKING_REPOSITORY, type SeriesTrackingRepository } from "../domain";
import { buildHomeDashboard } from "./home-dashboard.view";
import { RefreshTrackedSeriesUseCase } from "./refresh-tracked-series.usecase";

/**
 * Construit le tableau de bord de l'accueil : séries en cours et séries laissées
 * de côté (pas d'épisode vu depuis un moment). Lecture seule (pas d'événement).
 * Rafraîchit au préalable la structure des séries périmées (garde-fou de fraîcheur)
 * pour que « à commencer » voie les épisodes fraîchement diffusés.
 */
@Injectable()
export class GetHomeDashboardUseCase implements UseCase<string, HomeDashboard> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
    private readonly refresh: RefreshTrackedSeriesUseCase,
  ) {}

  async execute(userId: string): Promise<HomeDashboard> {
    await this.refresh.execute(userId);
    const records = await this.repo.listTrackedSeries(userId);
    return buildHomeDashboard(records, new Date());
  }
}
