import { Inject, Injectable } from "@nestjs/common";
import type { HomeDashboard } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { SERIES_TRACKING_REPOSITORY, type SeriesTrackingRepository } from "../domain";
import { buildHomeDashboard } from "./home-dashboard.view";

/**
 * Construit le tableau de bord de l'accueil : séries en cours et séries laissées
 * de côté (pas d'épisode vu depuis un moment). Lecture seule (pas d'événement).
 */
@Injectable()
export class GetHomeDashboardUseCase implements UseCase<string, HomeDashboard> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
  ) {}

  async execute(userId: string): Promise<HomeDashboard> {
    const records = await this.repo.listInProgress(userId);
    return buildHomeDashboard(records, new Date());
  }
}
