import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventPublisher } from "../../../shared/domain";
import type { LibraryItem, LibraryRepository, MediaDescriptor } from "../domain";
import { AddMediaToLibraryUseCase } from "./add-media-to-library.usecase";
import { RemoveFromLibraryUseCase } from "./remove-from-library.usecase";
import { SetWatchStatusUseCase } from "./set-watch-status.usecase";
import { ToggleFavoriteUseCase } from "./toggle-favorite.usecase";

const media: MediaDescriptor = {
  externalRef: { provider: "tmdb", externalId: "1" },
  type: "MOVIE",
  title: "Dune",
  year: 2021,
  posterUrl: null,
};

const item: LibraryItem = {
  id: "item-1",
  media,
  status: "PLANNED",
  rating: null,
  isFavorite: false,
  addedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("Library use cases", () => {
  let repo: LibraryRepository;
  let events: EventPublisher;

  beforeEach(() => {
    repo = {
      add: vi.fn().mockResolvedValue(item),
      findByUser: vi.fn().mockResolvedValue([item]),
      findItem: vi.fn().mockResolvedValue(item),
      remove: vi.fn().mockResolvedValue(undefined),
      setFavorite: vi.fn().mockResolvedValue({ ...item, isFavorite: true }),
      setStatus: vi.fn().mockResolvedValue({ ...item, status: "COMPLETED" }),
      setRating: vi.fn().mockResolvedValue({ ...item, rating: 8 }),
      getMediaId: vi.fn().mockResolvedValue("media-1"),
    };
    events = { publish: vi.fn().mockResolvedValue(undefined), publishAll: vi.fn() };
  });

  it("ajoute un média et émet MediaAdded", async () => {
    const useCase = new AddMediaToLibraryUseCase(repo, events);
    const result = await useCase.execute({ userId: "u1", media });
    expect(result).toBe(item);
    expect(repo.add).toHaveBeenCalledWith("u1", media);
    expect(vi.mocked(events.publish).mock.calls[0]?.[0]).toMatchObject({ name: "MediaAdded" });
  });

  it("bascule le favori et émet FavoriteAdded", async () => {
    const useCase = new ToggleFavoriteUseCase(repo, events);
    const result = await useCase.execute({ userId: "u1", itemId: "item-1", isFavorite: true });
    expect(result.isFavorite).toBe(true);
    expect(vi.mocked(events.publish).mock.calls[0]?.[0]).toMatchObject({ name: "FavoriteAdded" });
  });

  it("retire un média et émet MediaRemoved", async () => {
    const useCase = new RemoveFromLibraryUseCase(repo, events);
    await useCase.execute({ userId: "u1", itemId: "item-1" });
    expect(repo.remove).toHaveBeenCalledWith("u1", "item-1");
    expect(vi.mocked(events.publish).mock.calls[0]?.[0]).toMatchObject({ name: "MediaRemoved" });
  });

  it("marque un film « vu » et émet WatchStatusChanged puis MovieCompleted", async () => {
    const useCase = new SetWatchStatusUseCase(repo, events);
    const result = await useCase.execute({ userId: "u1", itemId: "item-1", status: "COMPLETED" });

    expect(result.status).toBe("COMPLETED");
    expect(repo.setStatus).toHaveBeenCalledWith("u1", "item-1", "COMPLETED");
    const names = vi.mocked(events.publish).mock.calls.map((c) => (c[0] as { name: string }).name);
    expect(names).toEqual(["WatchStatusChanged", "MovieCompleted"]);
  });

  it("ne réémet rien si le statut est inchangé", async () => {
    vi.mocked(repo.findItem).mockResolvedValue({ ...item, status: "COMPLETED" });
    const useCase = new SetWatchStatusUseCase(repo, events);
    await useCase.execute({ userId: "u1", itemId: "item-1", status: "COMPLETED" });

    expect(repo.setStatus).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("met une série « à voir » sans émettre MovieCompleted", async () => {
    const seriesItem = {
      ...item,
      status: "IN_PROGRESS" as const,
      media: { ...media, type: "SERIES" as const },
    };
    vi.mocked(repo.findItem).mockResolvedValue(seriesItem);
    vi.mocked(repo.setStatus).mockResolvedValue({ ...seriesItem, status: "PLANNED" });
    const useCase = new SetWatchStatusUseCase(repo, events);
    await useCase.execute({ userId: "u1", itemId: "item-1", status: "PLANNED" });

    const names = vi.mocked(events.publish).mock.calls.map((c) => (c[0] as { name: string }).name);
    expect(names).toEqual(["WatchStatusChanged"]);
  });

  it("échoue à retirer un élément inexistant (404)", async () => {
    vi.mocked(repo.findItem).mockResolvedValue(null);
    const useCase = new RemoveFromLibraryUseCase(repo, events);
    await expect(useCase.execute({ userId: "u1", itemId: "x" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
