import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SeriesCatalogProvider } from "../../media/domain";
import type { SeriesSyncCandidate, SeriesTrackingRepository } from "../domain";
import {
  RefreshTrackedSeriesUseCase,
  SERIES_SYNC_MAX_PER_RUN,
} from "./refresh-tracked-series.usecase";

describe("RefreshTrackedSeriesUseCase", () => {
  let repo: SeriesTrackingRepository;
  let catalog: SeriesCatalogProvider;

  beforeEach(() => {
    repo = {
      listSeriesNeedingSync: vi.fn(async () => [{ mediaId: "m1", externalId: "e1" }]),
      saveSeasons: vi.fn(async () => undefined),
      markEpisodesSynced: vi.fn(async () => undefined),
    } as unknown as SeriesTrackingRepository;
    catalog = {
      name: "fake",
      getSeriesDetails: vi.fn(async () => ({
        seasons: [
          {
            number: 2,
            episodes: [
              {
                seasonNumber: 2,
                number: 1,
                title: "À venir",
                runtimeMinutes: 50,
                airDate: "2099-01-01",
              },
            ],
          },
        ],
      })),
    } as unknown as SeriesCatalogProvider;
  });

  it("resynchronise et horodate chaque série périmée", async () => {
    const useCase = new RefreshTrackedSeriesUseCase(repo, catalog);
    await useCase.execute("u1");

    expect(catalog.getSeriesDetails).toHaveBeenCalledWith("e1");
    expect(repo.saveSeasons).toHaveBeenCalledWith("m1", [
      {
        number: 2,
        episodes: [
          {
            seasonNumber: 2,
            number: 1,
            title: "À venir",
            runtimeMinutes: 50,
            airDate: new Date("2099-01-01"),
          },
        ],
      },
    ]);
    expect(repo.markEpisodesSynced).toHaveBeenCalledWith("m1", expect.any(Date));
  });

  it("interroge le dépôt avec une borne de fraîcheur dans le passé", async () => {
    const useCase = new RefreshTrackedSeriesUseCase(repo, catalog);
    const before = Date.now();
    await useCase.execute("u1");

    expect(repo.listSeriesNeedingSync).toHaveBeenCalledWith("u1", expect.any(Date));
    const staleBefore = vi.mocked(repo.listSeriesNeedingSync).mock.calls[0]?.[1] as Date;
    expect(staleBefore.getTime()).toBeLessThan(before);
  });

  it("ne fait aucun appel catalogue quand rien n'est périmé", async () => {
    vi.mocked(repo.listSeriesNeedingSync).mockResolvedValue([]);
    const useCase = new RefreshTrackedSeriesUseCase(repo, catalog);
    await useCase.execute("u1");

    expect(catalog.getSeriesDetails).not.toHaveBeenCalled();
    expect(repo.markEpisodesSynced).not.toHaveBeenCalled();
  });

  it("best-effort : un échec catalogue n'interrompt pas et horodate quand même (back-off)", async () => {
    vi.mocked(repo.listSeriesNeedingSync).mockResolvedValue([
      { mediaId: "m1", externalId: "e1" },
      { mediaId: "m2", externalId: "e2" },
    ]);
    vi.mocked(catalog.getSeriesDetails).mockRejectedValueOnce(new Error("TMDB down"));

    const useCase = new RefreshTrackedSeriesUseCase(repo, catalog);
    await expect(useCase.execute("u1")).resolves.toBeUndefined();

    // La série en échec n'est pas sauvegardée mais est horodatée pour éviter le matraquage.
    expect(repo.saveSeasons).toHaveBeenCalledTimes(1);
    expect(repo.saveSeasons).toHaveBeenCalledWith("m2", expect.anything());
    expect(repo.markEpisodesSynced).toHaveBeenCalledWith("m1", expect.any(Date));
    expect(repo.markEpisodesSynced).toHaveBeenCalledWith("m2", expect.any(Date));
  });

  it("borne le nombre d'appels catalogue par exécution", async () => {
    const many: SeriesSyncCandidate[] = Array.from(
      { length: SERIES_SYNC_MAX_PER_RUN + 5 },
      (_, i) => ({ mediaId: `m${i}`, externalId: `e${i}` }),
    );
    vi.mocked(repo.listSeriesNeedingSync).mockResolvedValue(many);

    const useCase = new RefreshTrackedSeriesUseCase(repo, catalog);
    await useCase.execute("u1");

    expect(catalog.getSeriesDetails).toHaveBeenCalledTimes(SERIES_SYNC_MAX_PER_RUN);
  });
});
