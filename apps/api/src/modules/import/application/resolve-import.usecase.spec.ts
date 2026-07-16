import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolveImportInput } from "@otium/types";
import type { MediaImporter } from "./media-importer";
import { ResolveImportUseCase } from "./resolve-import.usecase";

const input: ResolveImportInput = {
  candidate: { externalId: "the100", title: "Les 100", year: 2014, posterUrl: "https://img/p.jpg" },
  entry: {
    type: "SERIES",
    title: "The 100",
    year: null,
    status: "IN_PROGRESS",
    watchedEpisodes: [
      { seasonNumber: 1, episodeNumber: 1, watchedAt: "2026-01-10T20:00:00.000Z" },
    ],
  },
};

describe("ResolveImportUseCase", () => {
  let importer: MediaImporter;
  let getLibrary: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    importer = { importOne: vi.fn(async () => 1) } as unknown as MediaImporter;
    getLibrary = { execute: vi.fn(async () => []) };
  });

  function build(): ResolveImportUseCase {
    return new ResolveImportUseCase(importer, getLibrary as never);
  }

  it("importe le candidat choisi avec l'entrée d'origine (dates converties)", async () => {
    const result = await build().execute({ userId: "u1", input });

    expect(result).toEqual({ imported: true, episodesMarked: 1 });
    expect(importer.importOne).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        type: "SERIES",
        title: "The 100",
        status: "IN_PROGRESS",
        watchedEpisodes: [
          { seasonNumber: 1, episodeNumber: 1, watchedAt: new Date("2026-01-10T20:00:00.000Z") },
        ],
      }),
      expect.objectContaining({
        externalRef: { provider: "tmdb", externalId: "the100" },
        title: "Les 100",
        posterUrl: "https://img/p.jpg",
      }),
    );
  });

  it("signale imported=false quand le média est déjà en bibliothèque (rafraîchi)", async () => {
    getLibrary.execute.mockResolvedValue([
      { media: { externalRef: { provider: "tmdb", externalId: "the100" } } },
    ]);
    const result = await build().execute({ userId: "u1", input });
    expect(result.imported).toBe(false);
    expect(importer.importOne).toHaveBeenCalled();
  });
});
