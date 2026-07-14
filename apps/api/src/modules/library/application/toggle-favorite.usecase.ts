import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import {
  FavoriteChanged,
  LIBRARY_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
} from "../domain";

export interface ToggleFavoriteInput {
  userId: string;
  itemId: string;
  isFavorite: boolean;
}

/** Marque/démarque un média comme favori et émet `FavoriteAdded`/`FavoriteRemoved`. */
@Injectable()
export class ToggleFavoriteUseCase implements UseCase<ToggleFavoriteInput, LibraryItem> {
  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute({ userId, itemId, isFavorite }: ToggleFavoriteInput): Promise<LibraryItem> {
    const existing = await this.library.findItem(userId, itemId);
    if (!existing) throw new NotFoundException("Élément de bibliothèque introuvable.");

    const item = await this.library.setFavorite(userId, itemId, isFavorite);
    await this.events.publish(new FavoriteChanged(userId, itemId, isFavorite));
    return item;
  }
}
