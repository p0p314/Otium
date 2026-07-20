import { z } from "zod";

/** Un genre et son nombre d'occurrences dans les médias regardés. */
export const GenreCount = z.object({
  label: z.string(),
  count: z.number().int().nonnegative(),
});
export type GenreCount = z.infer<typeof GenreCount>;

/** Minutes de visionnage sur une période (mois `YYYY-MM`). */
export const MonthlyActivity = z.object({
  month: z.string(),
  minutes: z.number().int().nonnegative(),
});
export type MonthlyActivity = z.infer<typeof MonthlyActivity>;

export const YearlyActivity = z.object({
  year: z.number().int(),
  minutes: z.number().int().nonnegative(),
});
export type YearlyActivity = z.infer<typeof YearlyActivity>;

/** Pages lues sur une période (mois `YYYY-MM`). */
export const MonthlyPages = z.object({
  month: z.string(),
  pages: z.number().int().nonnegative(),
});
export type MonthlyPages = z.infer<typeof MonthlyPages>;

/** Un auteur et son nombre de livres lus. */
export const AuthorCount = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
});
export type AuthorCount = z.infer<typeof AuthorCount>;

/**
 * Volet « lecture » du tableau de bord, alimenté par le **même** moteur que le visionnage
 * (une seule fonction pure assemble l'ensemble). Nul si l'utilisateur n'a aucun livre.
 */
export const ReadingStats = z.object({
  booksCompleted: z.number().int().nonnegative(),
  booksInProgress: z.number().int().nonnegative(),
  booksDropped: z.number().int().nonnegative(),
  pagesRead: z.number().int().nonnegative(),
  /** Pages lues par mois sur la fenêtre glissante (12 mois). */
  pagesByMonth: z.array(MonthlyPages),
  /** Livres terminés par année civile. */
  booksByYear: z.array(z.object({ year: z.number().int(), books: z.number().int().nonnegative() })),
  topAuthors: z.array(AuthorCount),
  /** Rythme de lecture moyen, en pages par jour sur la période active (null si inconnu). */
  pagesPerDay: z.number().nullable(),
  averageRating: z.number().nullable(),
});
export type ReadingStats = z.infer<typeof ReadingStats>;

/** Tableau de bord de statistiques de visionnage d'un utilisateur. */
export const ViewingStats = z.object({
  totals: z.object({
    moviesCompleted: z.number().int().nonnegative(),
    seriesCompleted: z.number().int().nonnegative(),
    seriesInProgress: z.number().int().nonnegative(),
    seriesDropped: z.number().int().nonnegative(),
    episodesWatched: z.number().int().nonnegative(),
    totalMinutes: z.number().int().nonnegative(),
    /** Temps de visionnage des films seuls (minutes). */
    movieMinutes: z.number().int().nonnegative(),
    /** Temps de visionnage des séries seules (minutes). */
    seriesMinutes: z.number().int().nonnegative(),
    averageRating: z.number().nullable(),
  }),
  breakdown: z.object({
    movies: z.number().int().nonnegative(),
    series: z.number().int().nonnegative(),
    books: z.number().int().nonnegative(),
  }),
  /** Volet lecture (livres). Toujours présent : à zéro tant qu'aucun livre n'est suivi. */
  reading: ReadingStats,
  topGenres: z.array(GenreCount),
  activityByMonth: z.array(MonthlyActivity),
  activityByYear: z.array(YearlyActivity),
  records: z.object({
    busiestMonth: MonthlyActivity.nullable(),
    longestSeries: z
      .object({ title: z.string(), episodes: z.number().int().nonnegative() })
      .nullable(),
  }),
});
export type ViewingStats = z.infer<typeof ViewingStats>;
