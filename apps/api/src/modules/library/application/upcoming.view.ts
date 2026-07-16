import type { UpcomingDashboard, UpcomingEpisode, UpcomingMovie } from "@otium/types";
import { type SeriesProgressRecord, type UpcomingMovieRecord, upcomingEpisodes } from "../domain";

/**
 * Assemble l'agenda « À venir » (**pur**, testable sans I/O), **cloisonné par type de
 * média** (jamais mélangés) : côté séries, les épisodes à diffusion **future** des
 * séries suivies (hors abandonnées) ; côté films, les sorties **futures** de la
 * bibliothèque. Chaque liste est triée par date croissante.
 */
export function buildUpcoming(
  seriesRecords: readonly SeriesProgressRecord[],
  movieRecords: readonly UpcomingMovieRecord[],
  now: Date,
): UpcomingDashboard {
  const series: UpcomingEpisode[] = [];
  for (const record of seriesRecords) {
    if (record.status === "DROPPED") continue;
    for (const episode of upcomingEpisodes(record.seasons, now)) {
      series.push({
        itemId: record.itemId,
        seriesTitle: record.title,
        posterUrl: record.posterUrl,
        seasonNumber: episode.seasonNumber,
        number: episode.number,
        title: episode.title,
        airDate: (episode.airDate as Date).toISOString(),
      });
    }
  }
  series.sort((a, b) => Date.parse(a.airDate) - Date.parse(b.airDate));

  const movies: UpcomingMovie[] = movieRecords
    .map((record) => ({
      itemId: record.itemId,
      title: record.title,
      posterUrl: record.posterUrl,
      releaseDate: record.releaseDate.toISOString(),
    }))
    .sort((a, b) => Date.parse(a.releaseDate) - Date.parse(b.releaseDate));

  return { series, movies };
}
