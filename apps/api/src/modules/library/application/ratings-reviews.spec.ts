import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventPublisher } from "../../../shared/domain";
import type { LibraryItem, LibraryRepository, Review, ReviewRepository } from "../domain";
import { RateMediaUseCase } from "./rate-media.usecase";
import { GetReviewUseCase, SaveReviewUseCase } from "./review.usecases";

const item = { id: "i1", rating: null } as unknown as LibraryItem;

function libraryFake(overrides: Partial<LibraryRepository> = {}): LibraryRepository {
  return {
    add: vi.fn(),
    findByUser: vi.fn(),
    findItem: vi.fn(),
    remove: vi.fn(),
    setFavorite: vi.fn(),
    setStatus: vi.fn(async (_u, _i, status) => ({ ...item, status })),
    setRating: vi.fn(async (_u, _i, rating) => ({ ...item, rating })),
    getMediaId: vi.fn(async () => "media-1"),
    backfillMediaMetadata: vi.fn(async () => undefined),
    saveProgress: vi.fn(),
    setConsumptionDates: vi.fn(),
    listUpcomingMovies: vi.fn(async () => []),
    ...overrides,
  };
}

const events: EventPublisher = { publish: vi.fn(async () => undefined), publishAll: vi.fn() };

describe("RateMediaUseCase", () => {
  beforeEach(() => vi.mocked(events.publish).mockClear());

  it("attribue une note et émet MediaRated", async () => {
    const library = libraryFake();
    const result = await new RateMediaUseCase(library, events).execute({
      userId: "u",
      itemId: "i1",
      rating: 8,
    });
    expect(library.setRating).toHaveBeenCalledWith("u", "i1", 8);
    expect(result.rating).toBe(8);
    expect(vi.mocked(events.publish).mock.calls[0]?.[0]).toMatchObject({ name: "MediaRated" });
  });

  it("note 0 efface la note (null)", async () => {
    const library = libraryFake();
    await new RateMediaUseCase(library, events).execute({ userId: "u", itemId: "i1", rating: 0 });
    expect(library.setRating).toHaveBeenCalledWith("u", "i1", null);
  });
});

describe("Review use cases", () => {
  let reviews: ReviewRepository;
  const saved: Review = { body: "Génial", updatedAt: new Date() };

  beforeEach(() => {
    vi.mocked(events.publish).mockClear();
    reviews = {
      get: vi.fn(async () => saved),
      save: vi.fn(async () => saved),
      delete: vi.fn(async () => undefined),
    };
  });

  it("enregistre un avis (résout le média) et émet CommentCreated", async () => {
    const result = await new SaveReviewUseCase(libraryFake(), reviews, events).execute(
      "u",
      "i1",
      "Génial",
    );
    expect(reviews.save).toHaveBeenCalledWith("u", "media-1", "Génial");
    expect(result.body).toBe("Génial");
    expect(vi.mocked(events.publish).mock.calls[0]?.[0]).toMatchObject({ name: "CommentCreated" });
  });

  it("404 si l'élément n'existe pas", async () => {
    const library = libraryFake({ getMediaId: vi.fn(async () => null) });
    await expect(new GetReviewUseCase(library, reviews).execute("u", "x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
