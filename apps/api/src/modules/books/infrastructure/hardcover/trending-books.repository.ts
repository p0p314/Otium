import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../shared/infrastructure/prisma/prisma.service";
import type { BookRecord, TrendingBooksRepository } from "../../domain";
import { HARDCOVER_SOURCE } from "./hardcover.mapper";

type SnapshotRow = {
  externalId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  description: string | null;
  publishedDate: string | null;
  infoUrl: string | null;
  rating: number | null;
};

/** Adapter Prisma de l'instantané des livres populaires. */
@Injectable()
export class PrismaTrendingBooksRepository implements TrendingBooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replace(source: string, books: readonly BookRecord[]): Promise<void> {
    // Transaction : sans elle, une interruption entre la suppression et l'insertion
    // laisserait l'écran de découverte vide jusqu'à la synchronisation suivante.
    await this.prisma.$transaction([
      this.prisma.trendingSnapshot.deleteMany({ where: { source } }),
      this.prisma.trendingSnapshot.createMany({
        data: books.map((book, position) => ({
          source,
          position,
          externalId: book.externalId,
          title: book.title,
          authors: [...book.authors],
          coverUrl: book.coverUrl,
          description: book.description,
          publishedDate: book.publishedDate,
          infoUrl: book.infoUrl,
          rating: book.averageRating,
        })),
      }),
    ]);
  }

  async list(source: string, limit: number): Promise<BookRecord[]> {
    const rows = await this.prisma.trendingSnapshot.findMany({
      where: { source },
      orderBy: { position: "asc" },
      take: limit,
      select: {
        externalId: true,
        title: true,
        authors: true,
        coverUrl: true,
        description: true,
        publishedDate: true,
        infoUrl: true,
        rating: true,
      },
    });
    return rows.map(toBookRecord);
  }
}

/**
 * Reconstitue le modèle normalisé depuis l'instantané. Les champs non stockés restent
 * `null` : l'instantané sert à **découvrir** un titre, pas à le décrire — l'ouverture de
 * la fiche passe par les catalogues, qui les renseignent (ADR-0016).
 */
function toBookRecord(row: SnapshotRow): BookRecord {
  return {
    externalId: row.externalId,
    source: HARDCOVER_SOURCE,
    title: row.title,
    subtitle: null,
    authors: row.authors,
    description: row.description,
    coverUrl: row.coverUrl,
    coverUrlLarge: row.coverUrl,
    categories: [],
    publishedDate: row.publishedDate,
    pageCount: null,
    language: null,
    publisher: null,
    isbn10: null,
    isbn13: null,
    googleBooksId: null,
    openLibraryId: null,
    infoUrl: row.infoUrl,
    previewUrl: null,
    averageRating: row.rating,
    ratingsCount: null,
    sources: [HARDCOVER_SOURCE],
    series: null,
  };
}
