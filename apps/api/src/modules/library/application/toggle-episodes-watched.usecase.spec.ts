import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { EventPublisher } from "../../../shared/domain";
import type { SeriesTrackingRepository, WatchStatus } from "../domain";
import { ToggleEpisodesWatchedUseCase } from "./toggle-episodes-watched.usecase";

const seasons = [
  {
    number: 1,
    episodes: [
      { id: "e1", seasonNumber: 1, number: 1, title: "Pilote" },
      { id: "e2", seasonNumber: 1, number: 2, title: "Suite" },
    ],
  },
];

function makeRepo(status: WatchStatus = "PLANNED") {
  const watched = new Set<string>();
  return {
    getContext: vi.fn(async () => ({ mediaId: "m1", externalId: "x", title: "Série", status })),
    countEpisodesOfMedia: vi.fn(async (_m: string, ids: readonly string[]) => ids.length),
    getWatchedEpisodeIds: vi.fn(async () => new Set(watched)),
    setEpisodesWatched: vi.fn(async (_i: string, ids: readonly string[], w: boolean) => {
      for (const id of ids) {
        if (w) watched.add(id);
        else watched.delete(id);
      }
    }),
    getSeasons: vi.fn(async () => seasons),
    setStatus: vi.fn(async () => undefined),
    hasEpisodes: vi.fn(),
    saveSeasons: vi.fn(),
    setEpisodeWatched: vi.fn(),
    isEpisodeOfMedia: vi.fn(),
    listInProgress: vi.fn(),
  } as unknown as SeriesTrackingRepository;
}

function makeEvents(): EventPublisher {
  return { publish: vi.fn(async () => undefined), publishAll: vi.fn(async () => undefined) };
}

describe("ToggleEpisodesWatchedUseCase", () => {
  it("marque plusieurs épisodes, émet un EpisodeWatched par nouvel épisode puis SeriesCompleted", async () => {
    const repo = makeRepo();
    const events = makeEvents();

    const view = await new ToggleEpisodesWatchedUseCase(repo, events).execute({
      userId: "u",
      itemId: "i",
      episodeIds: ["e1", "e2"],
      watched: true,
    });

    expect(repo.setEpisodesWatched).toHaveBeenCalledWith("i", ["e1", "e2"], true);
    const published = vi.mocked(events.publishAll).mock.calls[0]?.[0] as unknown as {
      name: string;
    }[];
    expect(published.map((e) => e.name)).toEqual(["EpisodeWatched", "EpisodeWatched"]);
    expect(vi.mocked(events.publish).mock.calls[0]?.[0]).toMatchObject({ name: "SeriesCompleted" });
    expect(view.status).toBe("COMPLETED");
    expect(view.watchedEpisodes).toBe(2);
  });

  it("démarquer en masse remet le statut à PLANNED sans émettre d'événement", async () => {
    const repo = makeRepo("COMPLETED");
    const events = makeEvents();

    const view = await new ToggleEpisodesWatchedUseCase(repo, events).execute({
      userId: "u",
      itemId: "i",
      episodeIds: ["e1", "e2"],
      watched: false,
    });

    expect(view.status).toBe("PLANNED");
    expect(events.publishAll).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("rejette (404) si un épisode n'appartient pas à la série", async () => {
    const repo = makeRepo();
    vi.mocked(repo.countEpisodesOfMedia).mockResolvedValueOnce(1); // 1 valide sur 2 demandés
    const events = makeEvents();

    await expect(
      new ToggleEpisodesWatchedUseCase(repo, events).execute({
        userId: "u",
        itemId: "i",
        episodeIds: ["e1", "inconnu"],
        watched: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.setEpisodesWatched).not.toHaveBeenCalled();
  });
});
