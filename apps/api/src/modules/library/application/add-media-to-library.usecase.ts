import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import {
  LIBRARY_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
  MediaAdded,
  type MediaDescriptor,
} from "../domain";

export interface AddMediaToLibraryInput {
  userId: string;
  media: MediaDescriptor;
}

/** Ajoute un média à la bibliothèque de l'utilisateur et émet `MediaAdded`. */
@Injectable()
export class AddMediaToLibraryUseCase implements UseCase<AddMediaToLibraryInput, LibraryItem> {
  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute({ userId, media }: AddMediaToLibraryInput): Promise<LibraryItem> {
    const item = await this.library.add(userId, media);
    await this.events.publish(new MediaAdded(userId, item.id, media.type));
    return item;
  }
}
