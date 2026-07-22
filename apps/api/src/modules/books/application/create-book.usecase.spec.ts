import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityBookRepository, NewCommunityBook } from "../domain";
import { CreateBookUseCase } from "./create-book.usecase";

describe("CreateBookUseCase", () => {
  let saved: NewCommunityBook | null;
  let repo: CommunityBookRepository;
  let useCase: CreateBookUseCase;

  beforeEach(() => {
    saved = null;
    repo = {
      create: vi.fn(async (book: NewCommunityBook) => {
        saved = book;
        return { externalId: "new" } as never;
      }),
      search: vi.fn(),
      findByExternalId: vi.fn(),
      findByIsbn: vi.fn(),
      listPending: vi.fn(),
      promote: vi.fn(),
    };
    useCase = new CreateBookUseCase(repo);
  });

  it("crée un livre avec le seul titre", async () => {
    await useCase.execute({ title: "Carnet de voyage" });

    expect(saved).toMatchObject({
      title: "Carnet de voyage",
      authors: [],
      description: null,
      pageCount: null,
      isbn10: null,
      isbn13: null,
    });
  });

  it("nettoie le titre des espaces superflus", async () => {
    await useCase.execute({ title: "  Dune  " });
    expect(saved?.title).toBe("Dune");
  });

  it("écarte les auteurs et catégories vides", async () => {
    await useCase.execute({ title: "T", authors: ["Camus", "  ", ""], categories: ["Roman", " "] });

    expect(saved?.authors).toEqual(["Camus"]);
    expect(saved?.categories).toEqual(["Roman"]);
  });

  it("range l'ISBN selon sa longueur", async () => {
    await useCase.execute({ title: "T", isbn: "978-2-221-25205-5" });
    expect(saved).toMatchObject({ isbn13: "9782221252055", isbn10: null });

    await useCase.execute({ title: "T", isbn: "2070360024" });
    expect(saved).toMatchObject({ isbn10: "2070360024", isbn13: null });
  });

  it("ignore un ISBN invalide sans faire échouer la création", async () => {
    // Le refuser bloquerait une saisie légitime ; l'enregistrer permettrait de rapprocher
    // à tort ce livre d'un autre lors de la synchronisation avec les catalogues.
    await useCase.execute({ title: "T", isbn: "1234567890" });

    expect(saved).toMatchObject({ isbn10: null, isbn13: null });
    expect(repo.create).toHaveBeenCalled();
  });

  it("conserve les champs facultatifs fournis", async () => {
    await useCase.execute({
      title: "T",
      subtitle: "Sous-titre",
      description: "Résumé",
      coverUrl: "https://img.example/c.jpg",
      publishedDate: "1998",
      pageCount: 320,
      language: "fr",
      publisher: "Éditeur",
    });

    expect(saved).toMatchObject({
      subtitle: "Sous-titre",
      description: "Résumé",
      coverUrl: "https://img.example/c.jpg",
      publishedDate: "1998",
      pageCount: 320,
      language: "fr",
      publisher: "Éditeur",
    });
  });
});
