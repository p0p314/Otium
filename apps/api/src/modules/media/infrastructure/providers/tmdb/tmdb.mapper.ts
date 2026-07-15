import type { CatalogMedia, CatalogMediaType, CatalogSeason } from "../../../domain";
import type { TmdbSearchItem, TmdbSeasonDetails } from "./tmdb.types";

const TMDB_PROVIDER = "tmdb";

const TYPE_BY_MEDIA_TYPE: Record<string, CatalogMediaType> = {
  movie: "MOVIE",
  tv: "SERIES",
};

function parseYear(date: string | undefined): number | null {
  if (!date || date.length < 4) return null;
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

/**
 * Convertit un item TMDB en modèle catalogue normalisé, ou `null` si non pertinent.
 * `fallbackMediaType` sert aux endpoints typés (ex. `/trending/movie`) dont les items
 * n'exposent pas `media_type`.
 */
export function toCatalogMedia(
  item: TmdbSearchItem,
  imageBaseUrl: string,
  fallbackMediaType?: string,
): CatalogMedia | null {
  const type = TYPE_BY_MEDIA_TYPE[item.media_type ?? fallbackMediaType ?? ""];
  if (!type) return null; // écarte les personnes et types non supportés

  const title = item.title ?? item.name;
  if (!title) return null;

  return {
    externalRef: { provider: TMDB_PROVIDER, externalId: String(item.id) },
    type,
    title,
    year: parseYear(item.release_date ?? item.first_air_date),
    posterUrl: item.poster_path ? `${imageBaseUrl}${item.poster_path}` : null,
    genres: [],
  };
}

/** Convertit une saison TMDB (avec ses épisodes) en saison catalogue normalisée. */
export function toCatalogSeason(seasonNumber: number, season: TmdbSeasonDetails): CatalogSeason {
  return {
    number: seasonNumber,
    episodes: season.episodes.map((e) => ({
      seasonNumber: e.season_number,
      number: e.episode_number,
      title: e.name && e.name.trim() ? e.name : `Épisode ${e.episode_number}`,
      runtimeMinutes: e.runtime ?? null,
    })),
  };
}
