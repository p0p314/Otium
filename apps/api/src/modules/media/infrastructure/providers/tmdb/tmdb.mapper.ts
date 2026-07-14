import type { CatalogMedia, CatalogMediaType } from "../../../domain";
import type { TmdbSearchItem } from "./tmdb.types";

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

/** Convertit un item TMDB en modèle catalogue normalisé, ou `null` si non pertinent. */
export function toCatalogMedia(item: TmdbSearchItem, imageBaseUrl: string): CatalogMedia | null {
  const type = TYPE_BY_MEDIA_TYPE[item.media_type];
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
