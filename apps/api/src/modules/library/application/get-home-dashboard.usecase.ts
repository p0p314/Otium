import { Inject, Injectable } from "@nestjs/common";
import type { HomeDashboard } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { SERIES_TRACKING_REPOSITORY, type SeriesTrackingRepository } from "../domain";
import { buildHomeDashboard, staleInProgressItemIds } from "./home-dashboard.view";

/**
 * Construit le tableau de bord de l'accueil : séries à voir et séries laissées de côté,
 * à partir des données déjà en base. **Sans appel réseau** (l'accueil doit rester instantané).
 * Effet de bord idempotent : bascule en **arrière-plan** les séries inactives depuis plus de
 * 3 mois en « En pause » (elles sortent alors de l'accueil). La resynchronisation des dates de
 * diffusion est portée par « À venir » ({@link GetUpcomingUseCase}).
 */
@Injectable()
export class GetHomeDashboardUseCase implements UseCase<string, HomeDashboard> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
  ) {}

  async execute(userId: string): Promise<HomeDashboard> {
    const now = new Date();
    const records = await this.repo.listTrackedSeries(userId);

    // Non bloquant : les séries inactives > 3 mois passent « En pause » (idempotent : une fois
    // PAUSED, elles ne sont plus sélectionnées). N'échoue jamais l'affichage de l'accueil.
    const toPause = staleInProgressItemIds(records, now);
    if (toPause.length > 0) {
      void Promise.all(toPause.map((itemId) => this.repo.setStatus(itemId, "PAUSED"))).catch(
        () => undefined,
      );
    }

    return buildHomeDashboard(records, now);
  }
}
