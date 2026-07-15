import type { ViewingStats } from "@otium/types";
import type { StatsRawData } from "../domain";

const MONTHS_WINDOW = 12;
const TOP_GENRES = 8;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Les `count` derniers mois (clés `YYYY-MM`), du plus ancien au mois courant. */
function lastMonths(now: Date, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return keys;
}

/**
 * Assemble le tableau de bord de statistiques (**pur**, testable sans I/O) à partir des
 * données brutes : temps par mois/année, genres les plus regardés, records.
 */
export function buildViewingStats(raw: StatsRawData, now: Date): ViewingStats {
  const monthMinutes = new Map<string, number>();
  const yearMinutes = new Map<number, number>();
  const addActivity = (date: Date, minutes: number) => {
    if (minutes <= 0) return;
    monthMinutes.set(monthKey(date), (monthMinutes.get(monthKey(date)) ?? 0) + minutes);
    yearMinutes.set(date.getUTCFullYear(), (yearMinutes.get(date.getUTCFullYear()) ?? 0) + minutes);
  };
  for (const e of raw.episodes) addActivity(e.watchedAt, e.minutes);
  for (const m of raw.completedMovies) addActivity(m.completedAt, m.minutes);

  const seriesMinutes = raw.episodes.reduce((sum, e) => sum + e.minutes, 0);
  const movieMinutes = raw.completedMovies.reduce((sum, m) => sum + m.minutes, 0);
  const totalMinutes = seriesMinutes + movieMinutes;

  const activityByMonth = lastMonths(now, MONTHS_WINDOW).map((month) => ({
    month,
    minutes: monthMinutes.get(month) ?? 0,
  }));

  const activityByYear = [...yearMinutes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, minutes]) => ({ year, minutes }));

  const genreCount = new Map<string, number>();
  for (const g of raw.watchedGenres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
  const topGenres = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_GENRES)
    .map(([label, count]) => ({ label, count }));

  const busiest = [...monthMinutes.entries()].sort((a, b) => b[1] - a[1])[0];

  const seriesEpisodes = new Map<string, number>();
  for (const e of raw.episodes) seriesEpisodes.set(e.seriesTitle, (seriesEpisodes.get(e.seriesTitle) ?? 0) + 1);
  const longest = [...seriesEpisodes.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    totals: {
      moviesCompleted: raw.moviesCompleted,
      seriesCompleted: raw.seriesCompleted,
      seriesInProgress: raw.seriesInProgress,
      seriesDropped: raw.seriesDropped,
      episodesWatched: raw.episodes.length,
      totalMinutes,
      movieMinutes,
      seriesMinutes,
      averageRating: raw.averageRating,
    },
    breakdown: { movies: raw.movies, series: raw.series },
    topGenres,
    activityByMonth,
    activityByYear,
    records: {
      busiestMonth: busiest ? { month: busiest[0], minutes: busiest[1] } : null,
      longestSeries: longest ? { title: longest[0], episodes: longest[1] } : null,
    },
  };
}
