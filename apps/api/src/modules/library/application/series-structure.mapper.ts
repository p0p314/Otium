import type { CatalogSeason } from "../../media/domain";
import type { PersistableSeason } from "../domain";

/**
 * Convertit la structure saisons/épisodes du catalogue vers le modèle persistable.
 * Point unique de conversion des dates de diffusion (ISO string → `Date`).
 */
export function toPersistableSeasons(seasons: readonly CatalogSeason[]): PersistableSeason[] {
  return seasons.map((season) => ({
    number: season.number,
    episodes: season.episodes.map((episode) => ({
      seasonNumber: episode.seasonNumber,
      number: episode.number,
      title: episode.title,
      runtimeMinutes: episode.runtimeMinutes,
      airDate: episode.airDate ? new Date(episode.airDate) : null,
    })),
  }));
}
