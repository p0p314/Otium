export interface Review {
  readonly body: string;
  readonly updatedAt: Date;
}

/** Port de persistance des avis (un avis par utilisateur et par média). */
export interface ReviewRepository {
  get(userId: string, mediaId: string): Promise<Review | null>;
  save(userId: string, mediaId: string, body: string): Promise<Review>;
  delete(userId: string, mediaId: string): Promise<void>;
}

export const REVIEW_REPOSITORY = Symbol("REVIEW_REPOSITORY");
