import type { UpcomingDashboard, UpcomingEpisode } from "@otium/types";
import { type SeriesProgressRecord, upcomingEpisodes } from "../domain";

/**
 * Assemble l'agenda « À venir » (**pur**, testable sans I/O) : tous les épisodes à
 * diffusion **future** des séries suivies (hors abandonnées), triés par date
 * croissante. Cloisonné par type de média (V1 : séries).
 */
export function buildUpcoming(
  records: readonly SeriesProgressRecord[],
  now: Date,
): UpcomingDashboard {
  const series: UpcomingEpisode[] = [];

  for (const record of records) {
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
  return { series };
}
