import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaCatalogProvider } from "../../media/domain";
import type { ArchiveReader, ImportBatch, ImportSourceParser } from "../domain";
import { ImportArchiveUseCase } from "./import-archive.usecase";

const batch: ImportBatch = {
  source: "tvtime",
  medias: [
    {
      type: "MOVIE",
      title: "Dune",
      year: 2021,
      status: "COMPLETED",
      runtimeMinutes: 155,
      watchedEpisodes: [],
    },
    {
      type: "MOVIE",
      title: "Tenet",
      year: 2020,
      status: "PLANNED",
      runtimeMinutes: 150,
      watchedEpisodes: [],
    },
    {
      type: "MOVIE",
      title: "Already",
      year: 2000,
      status: "COMPLETED",
      runtimeMinutes: null,
      watchedEpisodes: [],
    },
    {
      type: "MOVIE",
      title: "NoMatch",
      year: 1999,
      status: "COMPLETED",
      runtimeMinutes: null,
      watchedEpisodes: [],
    },
    {
      type: "SERIES",
      title: "Chernobyl",
      year: null,
      status: "IN_PROGRESS",
      runtimeMinutes: null,
      watchedEpisodes: [
        { seasonNumber: 1, episodeNumber: 1 },
        { seasonNumber: 1, episodeNumber: 2 },
      ],
    },
  ],
};

const CATALOG_IDS: Record<string, string> = {
  Dune: "d1",
  Tenet: "t1",
  Already: "a1",
  Chernobyl: "c1",
};

describe("ImportArchiveUseCase", () => {
  let archiveReader: ArchiveReader;
  let parser: ImportSourceParser;
  let catalog: MediaCatalogProvider;
  let getLibrary: { execute: ReturnType<typeof vi.fn> };
  let addMedia: { execute: ReturnType<typeof vi.fn> };
  let setWatchStatus: { execute: ReturnType<typeof vi.fn> };
  let markEpisodes: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    archiveReader = { read: vi.fn().mockResolvedValue([]) };
    parser = { format: "tvtime", supports: () => true, parse: () => batch };
    catalog = {
      name: "fake",
      getTrending: vi.fn(),
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn(),
      search: vi.fn(async ({ query }: { query: string }) => {
        const id = CATALOG_IDS[query];
        return {
          items: id
            ? [{ externalRef: { provider: "tmdb", externalId: id }, title: query, year: 2020 }]
            : [],
          page: 1,
          pageSize: 20,
          total: id ? 1 : 0,
        };
      }),
    } as unknown as MediaCatalogProvider;
    // « Already » (a1) est déjà en bibliothèque → dédoublonnage.
    getLibrary = {
      execute: vi
        .fn()
        .mockResolvedValue([{ media: { externalRef: { provider: "tmdb", externalId: "a1" } } }]),
    };
    addMedia = { execute: vi.fn(async () => ({ id: "item-1" })) };
    setWatchStatus = { execute: vi.fn().mockResolvedValue(undefined) };
    markEpisodes = { execute: vi.fn().mockResolvedValue({ marked: 2, unmatched: 0 }) };
  });

  function build(): ImportArchiveUseCase {
    return new ImportArchiveUseCase(
      archiveReader,
      [parser],
      catalog,
      getLibrary as never,
      addMedia as never,
      setWatchStatus as never,
      markEpisodes as never,
    );
  }

  it("importe films et séries, ignore les doublons et liste les non-rapprochés", async () => {
    const report = await build().execute({
      userId: "u1",
      format: "tvtime",
      archive: Buffer.from(""),
    });

    expect(report.movies).toEqual({ parsed: 4, imported: 2, skipped: 1, unmatched: 1 });
    expect(report.series).toEqual({ parsed: 1, imported: 1, skipped: 0, unmatched: 0 });
    expect(report.episodesMarked).toBe(2);
    expect(report.unmatchedSample).toContainEqual({ type: "MOVIE", title: "NoMatch", year: 1999 });
  });

  it("marque « vu » seulement les films COMPLETED", async () => {
    await build().execute({ userId: "u1", format: "tvtime", archive: Buffer.from("") });
    // Dune (COMPLETED) → un seul appel ; Tenet (PLANNED) n'en déclenche pas.
    expect(setWatchStatus.execute).toHaveBeenCalledTimes(1);
    expect(setWatchStatus.execute).toHaveBeenCalledWith({
      userId: "u1",
      itemId: "item-1",
      status: "COMPLETED",
    });
  });

  it("délègue le suivi des épisodes pour les séries", async () => {
    await build().execute({ userId: "u1", format: "tvtime", archive: Buffer.from("") });
    expect(markEpisodes.execute).toHaveBeenCalledWith({
      userId: "u1",
      itemId: "item-1",
      episodes: batch.medias[4]!.watchedEpisodes,
    });
  });

  it("rejette un format inconnu", async () => {
    parser = { format: "other", supports: () => false, parse: () => batch };
    await expect(
      build().execute({ userId: "u1", format: "tvtime", archive: Buffer.from("") }),
    ).rejects.toThrow();
  });
});
