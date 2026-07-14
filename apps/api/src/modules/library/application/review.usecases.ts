import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import {
  LIBRARY_REPOSITORY,
  type LibraryRepository,
  REVIEW_REPOSITORY,
  type Review,
  type ReviewRepository,
  ReviewSaved,
} from "../domain";

async function resolveMediaId(
  library: LibraryRepository,
  userId: string,
  itemId: string,
): Promise<string> {
  const mediaId = await library.getMediaId(userId, itemId);
  if (!mediaId) throw new NotFoundException("Élément de bibliothèque introuvable.");
  return mediaId;
}

@Injectable()
export class GetReviewUseCase {
  constructor(@Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository, @Inject(REVIEW_REPOSITORY) private readonly reviews: ReviewRepository) {}

  async execute(userId: string, itemId: string): Promise<Review | null> {
    const mediaId = await resolveMediaId(this.library, userId, itemId);
    return this.reviews.get(userId, mediaId);
  }
}

@Injectable()
export class SaveReviewUseCase {
  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(REVIEW_REPOSITORY) private readonly reviews: ReviewRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(userId: string, itemId: string, body: string): Promise<Review> {
    const mediaId = await resolveMediaId(this.library, userId, itemId);
    const review = await this.reviews.save(userId, mediaId, body);
    await this.events.publish(new ReviewSaved(userId, mediaId));
    return review;
  }
}

@Injectable()
export class DeleteReviewUseCase {
  constructor(@Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository, @Inject(REVIEW_REPOSITORY) private readonly reviews: ReviewRepository) {}

  async execute(userId: string, itemId: string): Promise<void> {
    const mediaId = await resolveMediaId(this.library, userId, itemId);
    await this.reviews.delete(userId, mediaId);
  }
}
