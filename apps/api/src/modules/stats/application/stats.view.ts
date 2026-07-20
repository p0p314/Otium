import type { ReadingStats, ViewingStats } from "@otium/types";
import type { StatsRawData } from "../domain";

const MONTHS_WINDOW = 12;
const TOP_GENRES = 8;
const TOP_AUTHORS = 8;
const MS_PER_DAY = 86_400_000;

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
 * Volet lecture, assemblé par le **même** moteur pur que le visionnage : mêmes fenêtres
 * glissantes, mêmes conventions de tri et d'égalité (ADR-0003 — les capacités
 * transversales sont écrites une seule fois).
 */
function buildReadingStats(raw: StatsRawData, now: Date): ReadingStats {
  const books = raw.booksInLibrary;
  const monthPages = new Map<string, number>();
  for (const entry of raw.progressEntries) {
    if (entry.pages <= 0) continue;
    monthPages.set(monthKey(entry.occurredAt), (monthPages.get(monthKey(entry.occurredAt)) ?? 0) + entry.pages);
  }

  const yearBooks = new Map<number, number>();
  for (const book of books) {
    if (book.finishedAt) {
      const year = book.finishedAt.getUTCFullYear();
      yearBooks.set(year, (yearBooks.get(year) ?? 0) + 1);
    }
  }

  const authorCount = new Map<string, number>();
  for (const book of books) {
    if (book.status !== "COMPLETED") continue;
    for (const author of book.authors) authorCount.set(author, (authorCount.get(author) ?? 0) + 1);
  }

  const rated = books.filter((b) => b.rating != null).map((b) => b.rating as number);
  const pagesRead = raw.progressEntries.reduce((sum, e) => sum + Math.max(0, e.pages), 0);

  return {
    booksCompleted: books.filter((b) => b.status === "COMPLETED").length,
    booksInProgress: books.filter((b) => b.status === "IN_PROGRESS").length,
    booksDropped: books.filter((b) => b.status === "DROPPED").length,
    pagesRead,
    pagesByMonth: lastMonths(now, MONTHS_WINDOW).map((month) => ({
      month,
      pages: monthPages.get(month) ?? 0,
    })),
    booksByYear: [...yearBooks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, books: count })),
    topAuthors: [...authorCount.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_AUTHORS)
      .map(([name, count]) => ({ name, count })),
    pagesPerDay: readingPace(raw, pagesRead, now),
    averageRating: rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
  };
}

/**
 * Rythme moyen : pages lues rapportées à la durée **réellement observée** (du premier
 * avancement à aujourd'hui), et non à une fenêtre arbitraire — un lecteur récent n'est
 * pas pénalisé par les mois où il n'utilisait pas encore l'application.
 */
function readingPace(raw: StatsRawData, pagesRead: number, now: Date): number | null {
  if (pagesRead === 0 || raw.progressEntries.length === 0) return null;
  const first = Math.min(...raw.progressEntries.map((e) => e.occurredAt.getTime()));
  const days = Math.max(1, Math.ceil((now.getTime() - first) / MS_PER_DAY));
  return Math.round((pagesRead / days) * 10) / 10;
}

/**
 * Assemble le tableau de bord de statistiques (**pur**, testable sans I/O) à partir des
 * données brutes : temps par mois/année, genres les plus regardés, records, lecture.
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
    breakdown: { movies: raw.movies, series: raw.series, books: raw.books },
    reading: buildReadingStats(raw, now),
    topGenres,
    activityByMonth,
    activityByYear,
    records: {
      busiestMonth: busiest ? { month: busiest[0], minutes: busiest[1] } : null,
      longestSeries: longest ? { title: longest[0], episodes: longest[1] } : null,
    },
  };
}
