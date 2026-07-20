import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type { StatsRawData, StatsRepository } from "../domain";

/**
 * Adapter Prisma du port `StatsRepository`. Agrégations indexées (comptages/moyenne)
 * + lectures ciblées pour les séries temporelles (assemblées en pur côté application).
 */
@Injectable()
export class PrismaStatsRepository implements StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getRawData(userId: string): Promise<StatsRawData> {
    const [
      moviesCompleted,
      seriesCompleted,
      seriesInProgress,
      seriesDropped,
      movies,
      series,
      ratingAgg,
      episodeRows,
      movieRows,
      genreRows,
      books,
      progressRows,
      bookRows,
    ] = await Promise.all([
      this.prisma.libraryItem.count({ where: { userId, status: "COMPLETED", media: { type: "MOVIE" } } }),
      this.prisma.libraryItem.count({ where: { userId, status: "COMPLETED", media: { type: "SERIES" } } }),
      this.prisma.libraryItem.count({ where: { userId, status: "IN_PROGRESS", media: { type: "SERIES" } } }),
      this.prisma.libraryItem.count({ where: { userId, status: "DROPPED", media: { type: "SERIES" } } }),
      this.prisma.libraryItem.count({ where: { userId, media: { type: "MOVIE" } } }),
      this.prisma.libraryItem.count({ where: { userId, media: { type: "SERIES" } } }),
      this.prisma.libraryItem.aggregate({ where: { userId, rating: { not: null } }, _avg: { rating: true } }),
      this.prisma.watchedEpisode.findMany({
        where: { libraryItem: { userId } },
        select: {
          watchedAt: true,
          episode: {
            select: {
              runtimeMinutes: true,
              season: { select: { media: { select: { title: true } } } },
            },
          },
        },
      }),
      this.prisma.libraryItem.findMany({
        where: { userId, status: "COMPLETED", media: { type: "MOVIE" } },
        select: { updatedAt: true, media: { select: { runtimeMinutes: true } } },
      }),
      this.prisma.libraryItem.findMany({
        where: { userId, status: { in: ["COMPLETED", "IN_PROGRESS"] } },
        select: { media: { select: { genres: true } } },
      }),
      this.prisma.libraryItem.count({ where: { userId, media: { type: "BOOK" } } }),
      // Historique d'avancement : seule source fiable des pages lues dans le temps.
      this.prisma.progressEntry.findMany({
        where: { libraryItem: { userId } },
        select: { occurredAt: true, unit: true, fromValue: true, toValue: true },
      }),
      this.prisma.libraryItem.findMany({
        where: { userId, media: { type: "BOOK" } },
        select: {
          status: true,
          finishedAt: true,
          rating: true,
          media: { select: { book: { select: { authors: true } } } },
        },
      }),
    ]);

    return {
      moviesCompleted,
      seriesCompleted,
      seriesInProgress,
      seriesDropped,
      movies,
      series,
      averageRating: ratingAgg._avg.rating,
      episodes: episodeRows.map((row) => ({
        watchedAt: row.watchedAt,
        minutes: row.episode.runtimeMinutes ?? 0,
        seriesTitle: row.episode.season.media.title,
      })),
      completedMovies: movieRows.map((row) => ({
        completedAt: row.updatedAt,
        minutes: row.media.runtimeMinutes ?? 0,
      })),
      watchedGenres: genreRows.flatMap((row) => row.media.genres),
      books,
      progressEntries: progressRows.map((row) => ({
        occurredAt: row.occurredAt,
        // Un avancement en pourcentage ne représente pas un nombre de pages connu :
        // il compte dans l'activité, pas dans le total de pages lues.
        pages: row.unit === "PAGES" ? Math.max(0, row.toValue - row.fromValue) : 0,
      })),
      booksInLibrary: bookRows.map((row) => ({
        status: row.status,
        finishedAt: row.finishedAt,
        rating: row.rating,
        authors: row.media.book?.authors ?? [],
      })),
    };
  }
}
