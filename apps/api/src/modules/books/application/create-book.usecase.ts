import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import {
  type BookRecord,
  COMMUNITY_BOOK_REPOSITORY,
  type CommunityBookRepository,
  isIsbn,
  normalizeIsbn,
  type NewCommunityBook,
} from "../domain";

export interface CreateBookInput {
  readonly title: string;
  readonly subtitle?: string | null;
  readonly authors?: readonly string[];
  readonly description?: string | null;
  readonly coverUrl?: string | null;
  readonly publishedDate?: string | null;
  readonly pageCount?: number | null;
  readonly isbn?: string | null;
  readonly categories?: readonly string[];
  readonly language?: string | null;
  readonly publisher?: string | null;
}

/**
 * Crée un livre absent des catalogues. Seul le titre est requis : exiger davantage
 * ferait échouer précisément le cas que cette fonctionnalité sert — un ouvrage rare,
 * ancien ou auto-édité dont on ne sait presque rien.
 *
 * Le livre créé est un média comme un autre : il devient aussitôt utilisable en
 * bibliothèque, en suivi, en statistiques et en recherche, sans code dédié.
 */
@Injectable()
export class CreateBookUseCase implements UseCase<CreateBookInput, BookRecord> {
  constructor(
    @Inject(COMMUNITY_BOOK_REPOSITORY) private readonly books: CommunityBookRepository,
  ) {}

  async execute(input: CreateBookInput): Promise<BookRecord> {
    const isbn = this.validIsbn(input.isbn);
    const book: NewCommunityBook = {
      title: input.title.trim(),
      subtitle: input.subtitle ?? null,
      // Les entrées vides sont écartées : un auteur « » n'est pas un auteur.
      authors: (input.authors ?? []).map((a) => a.trim()).filter(Boolean),
      description: input.description ?? null,
      coverUrl: input.coverUrl ?? null,
      publishedDate: input.publishedDate ?? null,
      pageCount: input.pageCount ?? null,
      isbn10: isbn?.length === 10 ? isbn : null,
      isbn13: isbn?.length === 13 ? isbn : null,
      categories: (input.categories ?? []).map((c) => c.trim()).filter(Boolean),
      language: input.language ?? null,
      publisher: input.publisher ?? null,
    };
    return this.books.create(book);
  }

  /**
   * Un ISBN dont la clé de contrôle est fausse est **ignoré** plutôt que rejeté : il ne
   * doit pas empêcher la création, mais l'enregistrer permettrait de rapprocher à tort ce
   * livre d'un autre lors de la synchronisation avec les catalogues officiels.
   */
  private validIsbn(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const normalized = normalizeIsbn(raw);
    return isIsbn(normalized) ? normalized : null;
  }
}
