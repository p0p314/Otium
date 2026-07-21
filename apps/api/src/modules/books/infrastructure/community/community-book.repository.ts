import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import {
  type BookRecord,
  COMMUNITY_SOURCE,
  type CommunityBookRepository,
  type NewCommunityBook,
  publicationYear,
} from "../../domain";

type BookRow = Prisma.MediaGetPayload<{ include: { book: true } }>;

/**
 * Adapter Prisma des livres communautaires. Ceux-ci sont des `Media` ordinaires —
 * seul leur `externalProvider` les distingue — et leurs métadonnées vivent dans la même
 * table que celles des livres du catalogue. C'est ce qui les rend immédiatement
 * utilisables partout : bibliothèque, statistiques, favoris et listes n'ont rien à savoir
 * de leur origine.
 */
@Injectable()
export class PrismaCommunityBookRepository implements CommunityBookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(book: NewCommunityBook): Promise<BookRecord> {
    const row = await this.prisma.media.create({
      data: {
        type: "BOOK",
        title: book.title,
        year: publicationYear(book.publishedDate),
        posterUrl: book.coverUrl,
        externalProvider: COMMUNITY_SOURCE,
        // L'identifiant est généré : un livre communautaire n'a, par définition, pas de
        // référence chez un fournisseur.
        externalId: crypto.randomUUID(),
        genres: [...book.categories],
        book: {
          create: {
            subtitle: book.subtitle,
            authors: [...book.authors],
            description: book.description,
            pageCount: book.pageCount,
            publisher: book.publisher,
            publishedDate: book.publishedDate,
            language: book.language,
            categories: [...book.categories],
            isbn10: book.isbn10,
            isbn13: book.isbn13,
            coverUrlLarge: book.coverUrl,
            sources: [COMMUNITY_SOURCE],
          },
        },
      },
      include: { book: true },
    });
    return toBookRecord(row);
  }

  /**
   * Recherche par titre **ou** auteur. `mode: "insensitive"` couvre la casse ; les accents
   * restent distinctifs — une recherche full-text les neutralisera lorsque le volume le
   * justifiera (voir la recherche par auteur).
   */
  async search(query: string, limit: number): Promise<BookRecord[]> {
    const rows = await this.prisma.media.findMany({
      where: {
        externalProvider: COMMUNITY_SOURCE,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { book: { authors: { has: query } } },
        ],
      },
      include: { book: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toBookRecord);
  }

  async findByExternalId(externalId: string): Promise<BookRecord | null> {
    const row = await this.prisma.media.findUnique({
      where: {
        externalProvider_externalId: { externalProvider: COMMUNITY_SOURCE, externalId },
      },
      include: { book: true },
    });
    return row ? toBookRecord(row) : null;
  }

  async findByIsbn(isbn: string): Promise<BookRecord | null> {
    const row = await this.prisma.media.findFirst({
      where: {
        externalProvider: COMMUNITY_SOURCE,
        book: { OR: [{ isbn13: isbn }, { isbn10: isbn }] },
      },
      include: { book: true },
    });
    return row ? toBookRecord(row) : null;
  }
}

/** Traduit une ligne `Media` + `BookMetadata` vers le modèle normalisé du domaine. */
function toBookRecord(row: BookRow): BookRecord {
  const book = row.book;
  return {
    externalId: row.externalId,
    source: COMMUNITY_SOURCE,
    title: row.title,
    subtitle: book?.subtitle ?? null,
    authors: book?.authors ?? [],
    description: book?.description ?? null,
    coverUrl: row.posterUrl,
    coverUrlLarge: book?.coverUrlLarge ?? row.posterUrl,
    categories: book?.categories ?? [],
    publishedDate: book?.publishedDate ?? null,
    pageCount: book?.pageCount ?? null,
    language: book?.language ?? null,
    publisher: book?.publisher ?? null,
    isbn10: book?.isbn10 ?? null,
    isbn13: book?.isbn13 ?? null,
    googleBooksId: null,
    openLibraryId: null,
    infoUrl: null,
    previewUrl: null,
    averageRating: null,
    ratingsCount: null,
    sources: [COMMUNITY_SOURCE],
    // Un livre saisi à la main n'appartient à aucune œuvre tant que rien ne l'y rattache.
    series: null,
  };
}
