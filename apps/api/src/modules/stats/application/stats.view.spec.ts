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
    averageRating: null,
    episodes: [],
    completedMovies: [],
    watchedGenres: [],
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
    expect(stats.breakdown).toEqual({ movies: 3, series: 2 });
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
  });
});
