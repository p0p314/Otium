import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { authorsText } from "../../../../shared/infrastructure/prisma/searchable-text";
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
            authorsText: authorsText(book.authors),
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
   * Recherche par titre et/ou auteur, insensible à la casse.
   *
   * La recherche d'auteur porte sur la colonne `authorsText`, couverte par un index
   * trigramme : la correspondance **partielle** (« camus » → « Albert Camus ») reste
   * rapide à grand volume. Écrire la condition autrement — `authors: { has }`, un
   * `unnest`, ou `array_to_string` — contournerait cet index.
   */
  async search(
    query: string,
    limit: number,
    field: "ALL" | "TITLE" | "AUTHOR" = "ALL",
  ): Promise<BookRecord[]> {
    const pattern = `%${query.trim()}%`;
    const byAuthor = Prisma.sql`b."authorsText" ILIKE ${pattern}`;
    const byTitle = Prisma.sql`m.title ILIKE ${pattern}`;
    const criterion =
      field === "AUTHOR" ? byAuthor : field === "TITLE" ? byTitle : Prisma.sql`${byTitle} OR ${byAuthor}`;

    const ids = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT m.id
      FROM "Media" m
      LEFT JOIN "BookMetadata" b ON b."mediaId" = m.id
      WHERE m."externalProvider" = ${COMMUNITY_SOURCE} AND (${criterion})
      ORDER BY m."createdAt" DESC
      LIMIT ${limit}
    `);
    if (ids.length === 0) return [];

    const rows = await this.prisma.media.findMany({
      where: { id: { in: ids.map((row) => row.id) } },
      include: { book: true },
    });
    // L'ordre de pertinence vient de la requête indexée, pas du second chargement.
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((row) => byId.get(row.id)).filter((row): row is BookRow => row !== undefined).map(toBookRecord);
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
