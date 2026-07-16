import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventPublisher } from "../../../shared/domain";
import type { MediaCatalogProvider } from "../../media/domain";
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
  let catalog: MediaCatalogProvider;

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
      backfillMediaMetadata: vi.fn().mockResolvedValue(undefined),
    };
    events = { publish: vi.fn().mockResolvedValue(undefined), publishAll: vi.fn() };
    // Par défaut : l'enrichissement échoue (dégradation gracieuse — média inchangé).
    catalog = {
      name: "fake",
      search: vi.fn(),
      getTrending: vi.fn(),
      getMediaDetails: vi.fn().mockRejectedValue(new Error("no details")),
      getSeriesDetails: vi.fn(),
    };
  });

  it("ajoute un média et émet MediaAdded", async () => {
    const useCase = new AddMediaToLibraryUseCase(repo, events, catalog);
    const result = await useCase.execute({ userId: "u1", media });
    expect(result).toBe(item);
    expect(repo.add).toHaveBeenCalledWith("u1", media);
    expect(vi.mocked(events.publish).mock.calls[0]?.[0]).toMatchObject({ name: "MediaAdded" });
  });

  it("enrichit le média (genres + durée) via le catalogue avant l'ajout", async () => {
    vi.mocked(catalog.getMediaDetails).mockResolvedValue({
      genres: [
        { id: "18", label: "Drame" },
        { id: "878", label: "Science-Fiction" },
      ],
      runtimeMinutes: 155,
    } as unknown as Awaited<ReturnType<MediaCatalogProvider["getMediaDetails"]>>);

    await new AddMediaToLibraryUseCase(repo, events, catalog).execute({ userId: "u1", media });

    expect(catalog.getMediaDetails).toHaveBeenCalledWith("MOVIE", "1");
    expect(repo.add).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ genres: ["Drame", "Science-Fiction"], runtimeMinutes: 155 }),
    );
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
    const useCase = new SetWatchStatusUseCase(repo, events, catalog);
    const result = await useCase.execute({ userId: "u1", itemId: "item-1", status: "COMPLETED" });

    expect(result.status).toBe("COMPLETED");
    expect(repo.setStatus).toHaveBeenCalledWith("u1", "item-1", "COMPLETED");
    const names = vi.mocked(events.publish).mock.calls.map((c) => (c[0] as { name: string }).name);
    expect(names).toEqual(["WatchStatusChanged", "MovieCompleted"]);
  });

  it("complète la durée d'un film « vu » dont la durée manque (backfill)", async () => {
    vi.mocked(repo.setStatus).mockResolvedValue({ ...item, status: "COMPLETED" }); // media sans runtimeMinutes
    vi.mocked(catalog.getMediaDetails).mockResolvedValue({
      genres: [{ id: "18", label: "Drame" }],
      runtimeMinutes: 155,
    } as unknown as Awaited<ReturnType<MediaCatalogProvider["getMediaDetails"]>>);
    const useCase = new SetWatchStatusUseCase(repo, events, catalog);

    await useCase.execute({ userId: "u1", itemId: "item-1", status: "COMPLETED" });

    expect(catalog.getMediaDetails).toHaveBeenCalledWith("MOVIE", "1");
    expect(repo.backfillMediaMetadata).toHaveBeenCalledWith(
      { provider: "tmdb", externalId: "1" },
      { genres: ["Drame"], runtimeMinutes: 155 },
    );
  });

  it("ne rappelle pas le catalogue si la durée du film est déjà connue", async () => {
    vi.mocked(repo.setStatus).mockResolvedValue({
      ...item,
      status: "COMPLETED",
      media: { ...media, runtimeMinutes: 120 },
    });
    const useCase = new SetWatchStatusUseCase(repo, events, catalog);

    await useCase.execute({ userId: "u1", itemId: "item-1", status: "COMPLETED" });

    expect(catalog.getMediaDetails).not.toHaveBeenCalled();
    expect(repo.backfillMediaMetadata).not.toHaveBeenCalled();
  });

  it("n'échoue pas le passage « vu » si le catalogue est indisponible", async () => {
    vi.mocked(repo.setStatus).mockResolvedValue({ ...item, status: "COMPLETED" });
    // catalog.getMediaDetails rejette par défaut (voir beforeEach)
    const useCase = new SetWatchStatusUseCase(repo, events, catalog);

    const result = await useCase.execute({ userId: "u1", itemId: "item-1", status: "COMPLETED" });

    expect(result.status).toBe("COMPLETED");
    expect(repo.backfillMediaMetadata).not.toHaveBeenCalled();
    const names = vi.mocked(events.publish).mock.calls.map((c) => (c[0] as { name: string }).name);
    expect(names).toEqual(["WatchStatusChanged", "MovieCompleted"]);
  });

  it("ne réémet rien si le statut est inchangé", async () => {
    vi.mocked(repo.findItem).mockResolvedValue({ ...item, status: "COMPLETED" });
    const useCase = new SetWatchStatusUseCase(repo, events, catalog);
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
    const useCase = new SetWatchStatusUseCase(repo, events, catalog);
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
