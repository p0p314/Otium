import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
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
  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute({ userId, itemId, status }: SetWatchStatusInput): Promise<LibraryItem> {
    const existing = await this.library.findItem(userId, itemId);
    if (!existing) throw new NotFoundException("Élément de bibliothèque introuvable.");
    if (existing.status === status) return existing;

    const item = await this.library.setStatus(userId, itemId, status);
    await this.events.publish(new WatchStatusChanged(userId, itemId, status));
    if (item.media.type === "MOVIE" && status === "COMPLETED") {
      await this.events.publish(new MovieCompleted(userId, itemId));
    }
    return item;
  }
}
