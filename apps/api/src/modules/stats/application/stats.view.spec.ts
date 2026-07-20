import { describe, expect, it } from "vitest";
import type { StatsRawData } from "../domain";
import { buildViewingStats } from "./stats.view";

const NOW = new Date("2026-07-15T00:00:00.000Z");

function raw(overrides: Partial<StatsRawData> = {}): StatsRawData {
  return {
    moviesCompleted: 0,
    seriesCompleted: 0,
    seriesInProgress: 0,
    seriesDropped: 0,
    movies: 0,
    series: 0,
    books: 0,
    averageRating: null,
    episodes: [],
    completedMovies: [],
    watchedGenres: [],
    progressEntries: [],
    booksInLibrary: [],
    ...overrides,
  };
}

describe("buildViewingStats", () => {
  it("agrège temps, épisodes, genres, activité et records", () => {
    const stats = buildViewingStats(
      raw({
        moviesCompleted: 2,
        seriesCompleted: 1,
        movies: 3,
        series: 2,
        averageRating: 7.5,
        episodes: [
          { watchedAt: new Date("2026-07-01T00:00:00Z"), minutes: 42, seriesTitle: "Chernobyl" },
          { watchedAt: new Date("2026-07-02T00:00:00Z"), minutes: 42, seriesTitle: "Chernobyl" },
          { watchedAt: new Date("2026-06-10T00:00:00Z"), minutes: 30, seriesTitle: "Dark" },
        ],
        completedMovies: [{ completedAt: new Date("2026-07-05T00:00:00Z"), minutes: 155 }],
        watchedGenres: ["Drame", "Drame", "Thriller"],
      }),
      NOW,
    );

    expect(stats.totals.episodesWatched).toBe(3);
    expect(stats.totals.totalMinutes).toBe(42 + 42 + 30 + 155);
    expect(stats.totals.seriesMinutes).toBe(42 + 42 + 30);
    expect(stats.totals.movieMinutes).toBe(155);
    expect(stats.totals.averageRating).toBe(7.5);
    expect(stats.breakdown).toEqual({ movies: 3, series: 2, books: 0 });
    expect(stats.topGenres[0]).toEqual({ label: "Drame", count: 2 });
    expect(stats.activityByMonth).toHaveLength(12);
    expect(stats.activityByMonth.at(-1)).toEqual({ month: "2026-07", minutes: 42 + 42 + 155 });
    expect(stats.records.longestSeries).toEqual({ title: "Chernobyl", episodes: 2 });
    expect(stats.records.busiestMonth?.month).toBe("2026-07");
  });

  it("gère un utilisateur sans activité", () => {
    const stats = buildViewingStats(raw(), NOW);
    expect(stats.totals.totalMinutes).toBe(0);
    expect(stats.activityByMonth).toHaveLength(12);
    expect(stats.records.busiestMonth).toBeNull();
    expect(stats.records.longestSeries).toBeNull();
    expect(stats.topGenres).toEqual([]);
    expect(stats.reading.pagesRead).toBe(0);
    expect(stats.reading.pagesPerDay).toBeNull();
  });

  describe("volet lecture", () => {
    const books = raw({
      books: 3,
      progressEntries: [
        { occurredAt: new Date("2026-07-01T00:00:00Z"), pages: 120 },
        { occurredAt: new Date("2026-07-05T00:00:00Z"), pages: 180 },
        { occurredAt: new Date("2026-06-20T00:00:00Z"), pages: 100 },
        // Avancement en pourcentage : compté comme activité, pas comme pages lues.
        { occurredAt: new Date("2026-07-06T00:00:00Z"), pages: 0 },
      ],
      booksInLibrary: [
        {
          status: "COMPLETED",
          finishedAt: new Date("2026-07-05T00:00:00Z"),
          authors: ["Frank Herbert"],
          rating: 9,
        },
        {
          status: "COMPLETED",
          finishedAt: new Date("2025-11-02T00:00:00Z"),
          authors: ["Frank Herbert"],
          rating: 8,
        },
        { status: "IN_PROGRESS", finishedAt: null, authors: ["Ursula K. Le Guin"], rating: null },
      ],
    });

    it("totalise les pages lues et les livres par statut", () => {
      const { reading } = buildViewingStats(books, NOW);

      expect(reading.pagesRead).toBe(400);
      expect(reading.booksCompleted).toBe(2);
      expect(reading.booksInProgress).toBe(1);
      expect(reading.booksDropped).toBe(0);
    });

    it("répartit les pages sur la fenêtre glissante de 12 mois", () => {
      const { reading } = buildViewingStats(books, NOW);

      expect(reading.pagesByMonth).toHaveLength(12);
      expect(reading.pagesByMonth.at(-1)).toEqual({ month: "2026-07", pages: 300 });
      expect(reading.pagesByMonth.at(-2)).toEqual({ month: "2026-06", pages: 100 });
    });

    it("compte les livres terminés par année civile", () => {
      const { reading } = buildViewingStats(books, NOW);
      expect(reading.booksByYear).toEqual([
        { year: 2025, books: 1 },
        { year: 2026, books: 1 },
      ]);
    });

    it("classe les auteurs les plus lus (livres terminés seulement)", () => {
      const { reading } = buildViewingStats(books, NOW);
      expect(reading.topAuthors).toEqual([{ name: "Frank Herbert", count: 2 }]);
    });

    it("calcule le rythme sur la période réellement observée", () => {
      const { reading } = buildViewingStats(books, NOW);
      // 400 pages du 20/06 au 15/07 = 25 jours → 16 pages/jour.
      expect(reading.pagesPerDay).toBe(16);
    });

    it("moyenne les notes des livres notés", () => {
      expect(buildViewingStats(books, NOW).reading.averageRating).toBe(8.5);
    });
  });
});
