import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EpisodeReviewRepository, SeriesTrackingRepository } from "../domain";
import {
  DeleteEpisodeReviewUseCase,
  GetEpisodeReviewUseCase,
  SaveEpisodeReviewUseCase,
} from "./episode-review.usecases";

describe("Episode review use cases", () => {
  let tracking: SeriesTrackingRepository;
  let reviews: EpisodeReviewRepository;

  beforeEach(() => {
    tracking = {
      getContext: vi.fn(async () => ({ mediaId: "m1", externalId: "e1", title: "S", status: "IN_PROGRESS" })),
      isEpisodeOfMedia: vi.fn(async () => true),
    } as unknown as SeriesTrackingRepository;
    reviews = {
      get: vi.fn(async () => ({ rating: 8, body: "Top", updatedAt: new Date() })),
      save: vi.fn(async (_u, _e, input) => ({ ...input, updatedAt: new Date() })),
      delete: vi.fn(async () => undefined),
    } as unknown as EpisodeReviewRepository;
  });

  it("lit la note/avis d'un épisode autorisé", async () => {
    const result = await new GetEpisodeReviewUseCase(tracking, reviews).execute("u1", "i1", "ep1");
    expect(reviews.get).toHaveBeenCalledWith("u1", "ep1");
    expect(result?.rating).toBe(8);
  });

  it("refuse un épisode n'appartenant pas à la série (404)", async () => {
    vi.mocked(tracking.isEpisodeOfMedia).mockResolvedValue(false);
    await expect(
      new GetEpisodeReviewUseCase(tracking, reviews).execute("u1", "i1", "ep1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("enregistre une note seule (sans avis)", async () => {
    const result = await new SaveEpisodeReviewUseCase(tracking, reviews).execute("u1", "i1", "ep1", {
      rating: 9,
      body: null,
    });
    expect(reviews.save).toHaveBeenCalledWith("u1", "ep1", { rating: 9, body: null });
    expect(result?.rating).toBe(9);
  });

  it("supprime quand note et avis sont vides (renvoie null)", async () => {
    const result = await new SaveEpisodeReviewUseCase(tracking, reviews).execute("u1", "i1", "ep1", {
      rating: null,
      body: "  ",
    });
    // « body » vide est normalisé côté contrat ; ici on passe null/whitespace → suppression.
    expect(reviews.delete).toHaveBeenCalledWith("u1", "ep1");
    expect(reviews.save).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("supprime la note/avis", async () => {
    await new DeleteEpisodeReviewUseCase(tracking, reviews).execute("u1", "i1", "ep1");
    expect(reviews.delete).toHaveBeenCalledWith("u1", "ep1");
  });
});
