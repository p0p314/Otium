import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import { authorsText } from "../../../../shared/infrastructure/prisma/searchable-text";
import {
  BOOKS_PROVIDER,
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

  async listPending(limit: number): Promise<BookRecord[]> {
    const rows = await this.prisma.media.findMany({
      where: { externalProvider: COMMUNITY_SOURCE },
      include: { book: true },
      take: limit,
      // Les plus anciens d'abord : un livre saisi il y a longtemps a plus de chances
      // d'être entré au catalogue depuis, et attend son tour depuis plus longtemps.
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toBookRecord);
  }

  async promote(communityExternalId: string, official: BookRecord): Promise<boolean> {
    const existing = await this.prisma.media.findUnique({
      where: {
        externalProvider_externalId: {
          externalProvider: BOOKS_PROVIDER,
          externalId: official.externalId,
        },
      },
      select: { id: true },
    });
    // L'ouvrage officiel est déjà suivi par quelqu'un : fusionner deux médias distincts
    // (et leurs bibliothèques) est une opération autrement plus risquée, qu'on ne tente
    // pas au fil d'une synchronisation automatique.
    if (existing) return false;

    const media = await this.prisma.media.findUnique({
      where: {
        externalProvider_externalId: {
          externalProvider: COMMUNITY_SOURCE,
          externalId: communityExternalId,
        },
      },
      select: { id: true },
    });
    if (!media) return false;

    // Une seule ligne change de référence : tout ce qui pointe sur `media.id` — élément
    // de bibliothèque, avis, progression, historique, appartenance à une liste — reste
    // intact par construction.
    await this.prisma.media.update({
      where: { id: media.id },
      data: {
        externalProvider: BOOKS_PROVIDER,
        externalId: official.externalId,
        title: official.title,
        year: publicationYear(official.publishedDate),
        posterUrl: official.coverUrl,
        genres: [...official.categories],
        book: {
          update: {
            subtitle: official.subtitle,
            authors: [...official.authors],
            authorsText: authorsText(official.authors),
            description: official.description,
            pageCount: official.pageCount,
            publisher: official.publisher,
            publishedDate: official.publishedDate,
            language: official.language,
            categories: [...official.categories],
            isbn10: official.isbn10,
            isbn13: official.isbn13,
            googleBooksId: official.googleBooksId,
            openLibraryId: official.openLibraryId,
            infoUrl: official.infoUrl,
            previewUrl: official.previewUrl,
            coverUrlLarge: official.coverUrlLarge,
            averageRating: official.averageRating,
            ratingsCount: official.ratingsCount,
            // La provenance communautaire est conservée : le livre a bien été saisi par
            // un utilisateur avant d'entrer au catalogue.
            sources: [...new Set([COMMUNITY_SOURCE, ...official.sources])],
          },
        },
      },
    });
    return true;
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
