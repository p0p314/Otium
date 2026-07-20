import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SeriesCatalogProvider } from "../../media/domain";
import type { SeriesTrackingRepository } from "../domain";
import { MarkWatchedEpisodesByNumberUseCase } from "./mark-watched-episodes-by-number.usecase";

const seasons = [
  {
    number: 1,
    episodes: [
      { id: "s1e1", seasonNumber: 1, number: 1, title: "a" },
      { id: "s1e2", seasonNumber: 1, number: 2, title: "b" },
    ],
  },
];

describe("MarkWatchedEpisodesByNumberUseCase", () => {
  let repo: SeriesTrackingRepository;
  let catalog: SeriesCatalogProvider;

  beforeEach(() => {
    repo = {
      getContext: vi.fn(async () => ({
        mediaId: "m1",
        externalId: "e1",
        title: "S",
        status: "PLANNED",
      })),
      hasEpisodes: vi.fn(async () => false),
      saveSeasons: vi.fn(async () => undefined),
      getSeasons: vi.fn(async () => seasons),
      getWatchedEpisodeIds: vi.fn(async () => new Set(["s1e1", "s1e2"])),
      setEpisodesWatched: vi.fn(async () => undefined),
      setEpisodesWatchedAt: vi.fn(async () => undefined),
      setStatus: vi.fn(async () => undefined),
      isEpisodeOfMedia: vi.fn(),
      countEpisodesOfMedia: vi.fn(),
      setEpisodeWatched: vi.fn(),
      listTrackedSeries: vi.fn(),
    } as unknown as SeriesTrackingRepository;
    catalog = {
      name: "fake",
      search: vi.fn(),
      getTrending: vi.fn(),
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn(async () => ({
        seasons: [
          {
            number: 1,
            episodes: [
              { seasonNumber: 1, number: 1, title: "a", runtimeMinutes: 50 },
              { seasonNumber: 1, number: 2, title: "b", runtimeMinutes: 50 },
            ],
          },
        ],
      })),
    } as unknown as SeriesCatalogProvider;
  });

  it("charge la structure manquante puis marque les épisodes rapprochés", async () => {
    const useCase = new MarkWatchedEpisodesByNumberUseCase(repo, catalog);
    const result = await useCase.execute({
      userId: "u1",
      itemId: "i1",
      episodes: [
        { seasonNumber: 1, episodeNumber: 1 },
        { seasonNumber: 1, episodeNumber: 2 },
        { seasonNumber: 9, episodeNumber: 9 }, // numérotation divergente → non rapproché
      ],
    });

    expect(catalog.getSeriesDetails).toHaveBeenCalledWith("e1");
    expect(repo.saveSeasons).toHaveBeenCalled();
    expect(repo.setEpisodesWatchedAt).toHaveBeenCalledWith("i1", [
      { episodeId: "s1e1", watchedAt: expect.any(Date) },
      { episodeId: "s1e2", watchedAt: expect.any(Date) },
    ]);
    expect(result).toEqual({ marked: 2, unmatched: 1 });
  });

  it("conserve la date de visionnage fournie (import de l'historique)", async () => {
    const useCase = new MarkWatchedEpisodesByNumberUseCase(repo, catalog);
    const watchedAt = new Date("2025-02-03T10:00:00Z");
    await useCase.execute({
      userId: "u1",
      itemId: "i1",
      episodes: [{ seasonNumber: 1, episodeNumber: 1, watchedAt }],
    });

    expect(repo.setEpisodesWatchedAt).toHaveBeenCalledWith("i1", [
      { episodeId: "s1e1", watchedAt },
    ]);
  });

  it("passe la série en COMPLETED quand tous les épisodes sont vus", async () => {
    const useCase = new MarkWatchedEpisodesByNumberUseCase(repo, catalog);
    await useCase.execute({
      userId: "u1",
      itemId: "i1",
      episodes: [
        { seasonNumber: 1, episodeNumber: 1 },
        { seasonNumber: 1, episodeNumber: 2 },
      ],
    });
    expect(repo.setStatus).toHaveBeenCalledWith("i1", "COMPLETED");
  });

  it("ne recharge pas la structure si elle est déjà en base", async () => {
    vi.mocked(repo.hasEpisodes).mockResolvedValue(true);
    const useCase = new MarkWatchedEpisodesByNumberUseCase(repo, catalog);
    await useCase.execute({
      userId: "u1",
      itemId: "i1",
      episodes: [{ seasonNumber: 1, episodeNumber: 1 }],
    });
    expect(catalog.getSeriesDetails).not.toHaveBeenCalled();
  });

  it("échoue si la série n'est pas dans la bibliothèque", async () => {
    vi.mocked(repo.getContext).mockResolvedValue(null);
    const useCase = new MarkWatchedEpisodesByNumberUseCase(repo, catalog);
    await expect(
      useCase.execute({ userId: "u1", itemId: "x", episodes: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
