import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookProvider, BookRecord, CommunityBookRepository } from "../domain";
import { ReconcileCommunityBooksUseCase } from "./reconcile-community-books.usecase";

function book(over: Partial<BookRecord> = {}): BookRecord {
  return {
    externalId: "own-1",
    source: "community",
    title: "Le Rivage des Syrtes",
    subtitle: null,
    authors: ["Julien Gracq"],
    description: null,
    coverUrl: null,
    coverUrlLarge: null,
    categories: [],
    publishedDate: "1951",
    pageCount: null,
    language: "fr",
    publisher: null,
    isbn10: null,
    isbn13: null,
    googleBooksId: null,
    openLibraryId: null,
    infoUrl: null,
    previewUrl: null,
    averageRating: null,
    ratingsCount: null,
    sources: ["community"],
    series: null,
    ...over,
  };
}

const officiel = book({ externalId: "g1", source: "google-books", sources: ["google-books"] });

describe("ReconcileCommunityBooksUseCase", () => {
  let repo: {
    listPending: ReturnType<typeof vi.fn>;
    promote: ReturnType<typeof vi.fn>;
  };
  let primary: BookProvider;
  let fallback: BookProvider;
  let useCase: ReconcileCommunityBooksUseCase;

  const provider = (name: string): BookProvider => ({
    name,
    searchBooks: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getByExternalId: vi.fn().mockResolvedValue(null),
    findByIsbn: vi.fn().mockResolvedValue(null),
  });

  beforeEach(() => {
    repo = { listPending: vi.fn().mockResolvedValue([]), promote: vi.fn().mockResolvedValue(true) };
    primary = provider("google-books");
    fallback = provider("open-library");
    useCase = new ReconcileCommunityBooksUseCase(
      repo as unknown as CommunityBookRepository,
      primary,
      fallback,
    );
  });

  it("rattache un livre dont l'équivalent officiel est trouvé", async () => {
    repo.listPending.mockResolvedValue([book()]);
    vi.mocked(primary.searchBooks).mockResolvedValue({ items: [officiel], total: 1 });

    const report = await useCase.execute();

    expect(repo.promote).toHaveBeenCalledWith("own-1", officiel);
    expect(report).toMatchObject({ examined: 1, promoted: 1 });
  });

  it("recherche par ISBN quand il est connu — c'est une identité", async () => {
    repo.listPending.mockResolvedValue([book({ isbn13: "9782072777998" })]);
    vi.mocked(primary.findByIsbn).mockResolvedValue(book({ isbn13: "9782072777998" }));

    await useCase.execute();

    expect(primary.findByIsbn).toHaveBeenCalledWith("9782072777998");
    expect(primary.searchBooks).not.toHaveBeenCalled();
  });

  it("examine plusieurs candidats, pas seulement le mieux classé", async () => {
    // Le premier résultat d'un fournisseur est souvent une édition ou une étude ;
    // n'examiner que lui ferait manquer des rapprochements légitimes.
    repo.listPending.mockResolvedValue([book()]);
    vi.mocked(primary.searchBooks).mockResolvedValue({
      items: [book({ title: "Étude sur Le Rivage des Syrtes", authors: ["Un critique"] }), officiel],
      total: 2,
    });

    const report = await useCase.execute();

    expect(repo.promote).toHaveBeenCalledWith("own-1", officiel);
    expect(report.promoted).toBe(1);
  });

  it("ne rattache pas un candidat qui ne correspond pas", async () => {
    repo.listPending.mockResolvedValue([book()]);
    vi.mocked(primary.searchBooks).mockResolvedValue({
      items: [book({ authors: ["Quelqu'un d'autre"] })],
      total: 1,
    });

    const report = await useCase.execute();

    expect(repo.promote).not.toHaveBeenCalled();
    expect(report).toMatchObject({ promoted: 0, unmatched: 1 });
  });

  it("n'interroge pas les sources pour un livre sans auteur", async () => {
    // Le rapprochement serait de toute façon rejeté : autant s'épargner l'appel réseau.
    repo.listPending.mockResolvedValue([book({ authors: [] })]);

    await useCase.execute();

    expect(primary.searchBooks).not.toHaveBeenCalled();
    expect(repo.promote).not.toHaveBeenCalled();
  });

  it("interroge le secours quand la source prioritaire ne trouve rien", async () => {
    repo.listPending.mockResolvedValue([book()]);
    vi.mocked(fallback.searchBooks).mockResolvedValue({ items: [officiel], total: 1 });

    const report = await useCase.execute();

    expect(fallback.searchBooks).toHaveBeenCalled();
    expect(report.promoted).toBe(1);
  });

  it("poursuit malgré une source en panne", async () => {
    repo.listPending.mockResolvedValue([book()]);
    vi.mocked(primary.searchBooks).mockRejectedValue(new Error("503"));
    vi.mocked(fallback.searchBooks).mockResolvedValue({ items: [officiel], total: 1 });

    await expect(useCase.execute()).resolves.toMatchObject({ promoted: 1 });
  });

  it("laisse le livre en place si l'ouvrage officiel est déjà suivi", async () => {
    // Fusionner deux médias et leurs bibliothèques est une opération distincte.
    repo.listPending.mockResolvedValue([book()]);
    vi.mocked(primary.searchBooks).mockResolvedValue({ items: [officiel], total: 1 });
    repo.promote.mockResolvedValue(false);

    const report = await useCase.execute();

    expect(report).toMatchObject({ examined: 1, promoted: 0 });
  });

  it("traite chaque livre du lot indépendamment", async () => {
    repo.listPending.mockResolvedValue([book(), book({ externalId: "own-2", authors: [] })]);
    vi.mocked(primary.searchBooks).mockResolvedValue({ items: [officiel], total: 1 });

    const report = await useCase.execute();

    // Le second est écarté sans empêcher le premier d'aboutir.
    expect(report).toMatchObject({ examined: 2, promoted: 1 });
  });

  it("ne fait rien quand aucun livre communautaire n'attend", async () => {
    await expect(useCase.execute()).resolves.toEqual({ examined: 0, promoted: 0, unmatched: 0 });
  });
});
