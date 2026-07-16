import { Inject, Injectable } from "@nestjs/common";
import type { HomeDashboard } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { SERIES_TRACKING_REPOSITORY, type SeriesTrackingRepository } from "../domain";
import { buildHomeDashboard } from "./home-dashboard.view";

/**
 * Construit le tableau de bord de l'accueil : séries à voir et séries laissées de côté,
 * à partir des données déjà en base. **Lecture seule et sans appel réseau** (pas de
 * rafraîchissement catalogue ici : l'accueil doit rester instantané). La resynchronisation
 * des dates de diffusion est portée par « À venir » ({@link GetUpcomingUseCase}).
 */
@Injectable()
export class GetHomeDashboardUseCase implements UseCase<string, HomeDashboard> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
  ) {}

  async execute(userId: string): Promise<HomeDashboard> {
    const records = await this.repo.listTrackedSeries(userId);
    return buildHomeDashboard(records, new Date());
  }
}
