import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import { LIBRARY_REPOSITORY, type LibraryRepository, MediaRemoved } from "../domain";

export interface RemoveFromLibraryInput {
  userId: string;
  itemId: string;
}

/** Retire un média de la bibliothèque et émet `MediaRemoved`. */
@Injectable()
export class RemoveFromLibraryUseCase implements UseCase<RemoveFromLibraryInput, void> {
  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute({ userId, itemId }: RemoveFromLibraryInput): Promise<void> {
    const item = await this.library.findItem(userId, itemId);
    if (!item) throw new NotFoundException("Élément de bibliothèque introuvable.");

    await this.library.remove(userId, itemId);
    await this.events.publish(new MediaRemoved(userId, itemId));
  }
}
