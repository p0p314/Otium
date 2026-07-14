import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import { LIBRARY_REPOSITORY, type LibraryItem, type LibraryRepository, MediaRated } from "../domain";

export interface RateMediaInput {
  userId: string;
  itemId: string;
  /** Note 0–10 ; 0 efface la note (média non noté). */
  rating: number;
}

/** Attribue (ou efface) la note d'un média et émet `MediaRated`. */
@Injectable()
export class RateMediaUseCase implements UseCase<RateMediaInput, LibraryItem> {
  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute({ userId, itemId, rating }: RateMediaInput): Promise<LibraryItem> {
    const value = rating === 0 ? null : rating;
    const item = await this.library.setRating(userId, itemId, value);
    await this.events.publish(new MediaRated(userId, itemId, value));
    return item;
  }
}
