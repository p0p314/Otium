import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookRecord, TrendingBooksRepository } from "../domain";
import type { HardcoverProvider } from "../infrastructure/hardcover/hardcover.provider";
import { GetBookDiscoveriesUseCase } from "./get-book-discoveries.usecase";

function book(over: Partial<BookRecord> = {}): BookRecord {
  return {
    externalId: "hc-1",
    source: "hardcover",
    title: "Un livre remarqué",
    subtitle: null,
    authors: ["Autrice"],
    description: null,
    coverUrl: null,
    coverUrlLarge: null,
    categories: [],
    publishedDate: "2025",
    pageCount: null,
    language: null,
    publisher: null,
    isbn10: null,
    isbn13: null,
    googleBooksId: null,
    openLibraryId: null,
    infoUrl: null,
    previewUrl: null,
    averageRating: null,
    ratingsCount: null,
    sources: ["hardcover"],
    series: null,
    ...over,
  };
}

/** Laisse la synchronisation, lancée sans être attendue, se dérouler. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("GetBookDiscoveriesUseCase", () => {
  let snapshots: { replace: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
  let hardcover: { isConfigured: ReturnType<typeof vi.fn>; fetchTrending: ReturnType<typeof vi.fn> };
  let jobs: { runIfDue: ReturnType<typeof vi.fn> };
  let useCase: GetBookDiscoveriesUseCase;

  /** Exécute la tâche immédiatement, comme le ferait une échéance dépassée. */
  const jobsDue = () =>
    vi.fn(async (_job: string, _interval: number, task: () => Promise<void>) => {
      await task();
      return true;
    });

  beforeEach(() => {
    snapshots = { replace: vi.fn().mockResolvedValue(undefined), list: vi.fn().mockResolvedValue([]) };
    hardcover = {
      isConfigured: vi.fn().mockReturnValue(true),
      fetchTrending: vi.fn().mockResolvedValue([book()]),
    };
    jobs = { runIfDue: vi.fn().mockResolvedValue(false) };
    useCase = new GetBookDiscoveriesUseCase(
      snapshots as unknown as TrendingBooksRepository,
      hardcover as unknown as HardcoverProvider,
      jobs as never,
    );
  });

  it("sert l'instantané en base, sans appeler la source", async () => {
    snapshots.list.mockResolvedValue([book(), book({ externalId: "hc-2" })]);

    const result = await useCase.execute();

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ type: "BOOK", title: "Un livre remarqué" });
    expect(hardcover.fetchTrending).not.toHaveBeenCalled();
  });

  it("rafraîchit l'instantané quand la synchronisation est due", async () => {
    jobs.runIfDue = jobsDue();

    await useCase.execute();
    await settle();

    expect(hardcover.fetchTrending).toHaveBeenCalled();
    expect(snapshots.replace).toHaveBeenCalledWith("hardcover", [book()]);
  });

  it("n'écrase pas l'instantané avec un résultat vide", async () => {
    // Un schéma modifié en bêta ne doit pas effacer des données encore valables.
    jobs.runIfDue = jobsDue();
    hardcover.fetchTrending.mockResolvedValue([]);

    await useCase.execute();
    await settle();

    expect(snapshots.replace).not.toHaveBeenCalled();
  });

  it("sert le dernier instantané quand la source est en panne", async () => {
    jobs.runIfDue = vi.fn().mockResolvedValue(false);
    snapshots.list.mockResolvedValue([book()]);
    hardcover.fetchTrending.mockRejectedValue(new Error("503"));

    const result = await useCase.execute();

    // La synchronisation peut échouer ; la page de découverte, non.
    expect(result.items).toHaveLength(1);
  });

  it("ne tente aucune synchronisation sans jeton configuré", async () => {
    hardcover.isConfigured.mockReturnValue(false);

    await useCase.execute();

    expect(jobs.runIfDue).not.toHaveBeenCalled();
  });

  it("renvoie une liste vide tant qu'aucune synchronisation n'a abouti", async () => {
    const result = await useCase.execute();
    expect(result).toMatchObject({ items: [], total: 0 });
  });
});
