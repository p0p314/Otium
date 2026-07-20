import { Inject, Injectable, Logger } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { SERIES_CATALOG_PROVIDER, type SeriesCatalogProvider } from "../../media/domain";
import {
  SERIES_TRACKING_REPOSITORY,
  type SeriesTrackingRepository,
} from "../domain";
import { toPersistableSeasons } from "./series-structure.mapper";

/** Fraîcheur au-delà de laquelle une série est resynchronisée (les grilles évoluent lentement). */
export const SERIES_SYNC_TTL_MS = 24 * 60 * 60 * 1000;

/** Plafond d'appels catalogue par rafraîchissement, pour borner la rafale réseau (éco-conception). */
export const SERIES_SYNC_MAX_PER_RUN = 12;

/**
 * Rafraîchit la structure saisons/épisodes (avec dates de diffusion) des séries suivies
 * dont les données sont **périmées** ou **jamais datées** — condition pour que « À venir »
 * voie les épisodes fraîchement annoncés/datés sur des séries déjà en bibliothèque.
 *
 * Déclenché en amont des lectures accueil/« À venir ». **Best-effort** : n'échoue jamais la
 * lecture appelante. **Borné** par un garde-fou de fraîcheur ({@link SERIES_SYNC_TTL_MS}) et un
 * plafond d'appels ({@link SERIES_SYNC_MAX_PER_RUN}) ; chaque tentative est horodatée (succès
 * comme échec) pour ne pas re-solliciter le catalogue avant la prochaine fenêtre.
 */
@Injectable()
export class RefreshTrackedSeriesUseCase implements UseCase<string, void> {
  private readonly logger = new Logger(RefreshTrackedSeriesUseCase.name);

  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly tracking: SeriesTrackingRepository,
    @Inject(SERIES_CATALOG_PROVIDER) private readonly catalog: SeriesCatalogProvider,
  ) {}

  async execute(userId: string): Promise<void> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - SERIES_SYNC_TTL_MS);
    const candidates = (await this.tracking.listSeriesNeedingSync(userId, staleBefore)).slice(
      0,
      SERIES_SYNC_MAX_PER_RUN,
    );

    for (const candidate of candidates) {
      try {
        const details = await this.catalog.getSeriesDetails(candidate.externalId);
        await this.tracking.saveSeasons(candidate.mediaId, toPersistableSeasons(details.seasons));
      } catch (error) {
        this.logger.warn(
          `Rafraîchissement de la série ${candidate.externalId} impossible : ${(error as Error).message}`,
        );
      } finally {
        // Horodater même en échec : borne les tentatives à une par fenêtre de fraîcheur.
        await this.tracking
          .markEpisodesSynced(candidate.mediaId, now)
          .catch((error: unknown) =>
            this.logger.warn(`Horodatage de synchro impossible : ${(error as Error).message}`),
          );
      }
    }
  }
}
