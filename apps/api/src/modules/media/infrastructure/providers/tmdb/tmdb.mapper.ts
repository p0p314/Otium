import type {
  CatalogCastMember,
  CatalogCompany,
  CatalogGenre,
  CatalogMedia,
  CatalogMediaDetails,
  CatalogMediaType,
  CatalogSeason,
  CatalogWatchProvider,
} from "../../../domain";
import type {
  TmdbCredits,
  TmdbGenre,
  TmdbMovieDetailsFull,
  TmdbSearchItem,
  TmdbSeasonDetails,
  TmdbTvDetailsFull,
  TmdbWatchProviders,
} from "./tmdb.types";

const TMDB_PROVIDER = "tmdb";

/** Tailles d'images TMDB par usage (compromis qualité/poids — éco-conception). */
const IMAGE_SIZE = { poster: "w342", backdrop: "w780", profile: "w185", logo: "w154" } as const;

/** Nombre d'acteurs principaux exposés sur la fiche. */
const MAX_CAST = 12;

function img(root: string, size: string, path: string | null | undefined): string | null {
  return path ? `${root}${size}${path}` : null;
}

function toGenres(genres: TmdbGenre[] | undefined): CatalogGenre[] {
  return (genres ?? []).map((g) => ({ id: String(g.id), label: g.name }));
}

function toCast(credits: TmdbCredits | undefined, root: string): CatalogCastMember[] {
  return (credits?.cast ?? []).slice(0, MAX_CAST).map((c) => ({
    name: c.name,
    character: c.character?.trim() ? c.character : null,
    profileUrl: img(root, IMAGE_SIZE.profile, c.profile_path),
  }));
}

function toCompanies(
  companies: { name: string; logo_path?: string | null }[] | undefined,
  root: string,
): CatalogCompany[] {
  return (companies ?? []).map((c) => ({
    name: c.name,
    logoUrl: img(root, IMAGE_SIZE.logo, c.logo_path),
  }));
}

/** Plateformes de diffusion (abonnement) pour la région donnée, dédupliquées. */
function toWatchProviders(
  providers: TmdbWatchProviders | undefined,
  region: string,
  root: string,
): CatalogWatchProvider[] {
  const flatrate = providers?.results?.[region]?.flatrate ?? [];
  const seen = new Set<string>();
  const result: CatalogWatchProvider[] = [];
  for (const p of flatrate) {
    if (seen.has(p.provider_name)) continue;
    seen.add(p.provider_name);
    result.push({ name: p.provider_name, logoUrl: img(root, IMAGE_SIZE.logo, p.logo_path) });
  }
  return result;
}

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
  const originalTitle = item.original_title ?? item.original_name ?? null;

  return {
    externalRef: { provider: TMDB_PROVIDER, externalId: String(item.id) },
    type,
    title,
    originalTitle: originalTitle && originalTitle !== title ? originalTitle : null,
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
      airDate: e.air_date && e.air_date.trim() ? e.air_date : null,
    })),
  };
}

function unique(names: string[]): string[] {
  return [...new Set(names)];
}

function rating(voteAverage: number | undefined, voteCount: number | undefined): number | null {
  return (voteCount ?? 0) > 0 && typeof voteAverage === "number" ? voteAverage : null;
}

/** Convertit une fiche film TMDB (avec crédits/plateformes) en modèle catalogue détaillé. */
export function toCatalogMovieDetails(
  movie: TmdbMovieDetailsFull,
  imageRoot: string,
  region: string,
): CatalogMediaDetails {
  const directors = (movie.credits?.crew ?? [])
    .filter((c) => c.job === "Director")
    .map((c) => c.name);
  return {
    externalRef: { provider: TMDB_PROVIDER, externalId: String(movie.id) },
    type: "MOVIE",
    title: movie.title ?? movie.original_title ?? "",
    originalTitle: movie.original_title ?? null,
    posterUrl: img(imageRoot, IMAGE_SIZE.poster, movie.poster_path),
    backdropUrl: img(imageRoot, IMAGE_SIZE.backdrop, movie.backdrop_path),
    overview: movie.overview?.trim() ? movie.overview : null,
    genres: toGenres(movie.genres),
    rating: rating(movie.vote_average, movie.vote_count),
    voteCount: movie.vote_count ?? 0,
    releaseDate: movie.release_date?.trim() ? movie.release_date : null,
    year: parseYear(movie.release_date),
    status: movie.status?.trim() ? movie.status : null,
    runtimeMinutes: movie.runtime && movie.runtime > 0 ? movie.runtime : null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    cast: toCast(movie.credits, imageRoot),
    directors: unique(directors),
    productionCompanies: toCompanies(movie.production_companies, imageRoot),
    watchProviders: toWatchProviders(movie["watch/providers"], region, imageRoot),
  };
}

/** Convertit une fiche série TMDB (avec crédits/plateformes) en modèle catalogue détaillé. */
export function toCatalogTvDetails(
  tv: TmdbTvDetailsFull,
  imageRoot: string,
  region: string,
): CatalogMediaDetails {
  const creators = (tv.created_by ?? []).map((c) => c.name);
  return {
    externalRef: { provider: TMDB_PROVIDER, externalId: String(tv.id) },
    type: "SERIES",
    title: tv.name ?? tv.original_name ?? "",
    originalTitle: tv.original_name ?? null,
    posterUrl: img(imageRoot, IMAGE_SIZE.poster, tv.poster_path),
    backdropUrl: img(imageRoot, IMAGE_SIZE.backdrop, tv.backdrop_path),
    overview: tv.overview?.trim() ? tv.overview : null,
    genres: toGenres(tv.genres),
    rating: rating(tv.vote_average, tv.vote_count),
    voteCount: tv.vote_count ?? 0,
    releaseDate: tv.first_air_date?.trim() ? tv.first_air_date : null,
    year: parseYear(tv.first_air_date),
    status: tv.status?.trim() ? tv.status : null,
    runtimeMinutes: null,
    numberOfSeasons: tv.number_of_seasons ?? null,
    numberOfEpisodes: tv.number_of_episodes ?? null,
    cast: toCast(tv.credits, imageRoot),
    directors: unique(creators),
    productionCompanies: toCompanies(tv.production_companies, imageRoot),
    watchProviders: toWatchProviders(tv["watch/providers"], region, imageRoot),
  };
}
