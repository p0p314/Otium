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

/** Tableau de bord de statistiques de visionnage d'un utilisateur. */
export const ViewingStats = z.object({
  totals: z.object({
    moviesCompleted: z.number().int().nonnegative(),
    seriesCompleted: z.number().int().nonnegative(),
    seriesInProgress: z.number().int().nonnegative(),
    seriesDropped: z.number().int().nonnegative(),
    episodesWatched: z.number().int().nonnegative(),
    totalMinutes: z.number().int().nonnegative(),
    averageRating: z.number().nullable(),
  }),
  breakdown: z.object({
    movies: z.number().int().nonnegative(),
    series: z.number().int().nonnegative(),
  }),
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
