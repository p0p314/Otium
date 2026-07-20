import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import { MEDIA_CATALOG_REGISTRY, type MediaCatalogRegistry } from "../../media/domain";
import {
  LIBRARY_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
  MovieCompleted,
  type WatchStatus,
  WatchStatusChanged,
} from "../domain";

export interface SetWatchStatusInput {
  userId: string;
  itemId: string;
  status: WatchStatus;
}

/**
 * Change le statut de suivi d'un élément (ex. film « vu » = COMPLETED, « à voir » =
 * PLANNED). Émet `WatchStatusChanged` et, pour un film terminé, `MovieCompleted`
 * (socle historique/statistiques — ADR-0006).
 */
@Injectable()
export class SetWatchStatusUseCase implements UseCase<SetWatchStatusInput, LibraryItem> {
  private readonly logger = new Logger(SetWatchStatusUseCase.name);

  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    @Inject(MEDIA_CATALOG_REGISTRY) private readonly catalog: MediaCatalogRegistry,
  ) {}

  async execute({ userId, itemId, status }: SetWatchStatusInput): Promise<LibraryItem> {
    const existing = await this.library.findItem(userId, itemId);
    if (!existing) throw new NotFoundException("Élément de bibliothèque introuvable.");
    if (existing.status === status) return existing;

    const item = await this.library.setStatus(userId, itemId, status);
    await this.events.publish(new WatchStatusChanged(userId, itemId, status));
    if (item.media.type === "MOVIE" && status === "COMPLETED") {
      await this.ensureMovieRuntime(item);
      await this.events.publish(new MovieCompleted(userId, itemId));
    }
    return item;
  }

  /**
   * Un film « vu » doit porter sa durée pour alimenter le temps de visionnage. Si
   * elle manque (ajout antérieur à l'enrichissement, ou enrichissement échoué), on
   * la complète depuis le catalogue. Best-effort : une panne du fournisseur n'échoue
   * jamais le changement de statut.
   */
  private async ensureMovieRuntime(item: LibraryItem): Promise<void> {
    if (item.media.runtimeMinutes != null) return;
    try {
      const details = await this.catalog
        .forType(item.media.type)
        .getMediaDetails(item.media.type, item.media.externalRef.externalId);
      await this.library.backfillMediaMetadata(item.media.externalRef, {
        genres: details.genres.map((g) => g.label),
        runtimeMinutes: details.runtimeMinutes ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `Durée du film indisponible (backfill ignoré) : ${(error as Error).message}`,
      );
    }
  }
}
