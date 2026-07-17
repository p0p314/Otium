/** Sous-ensemble des réponses TMDB utilisées par l'adapter (search/multi). */
export interface TmdbSearchResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbSearchItem[];
}

export interface TmdbSearchItem {
  id: number;
  // Absent des endpoints typés (ex. /trending/movie) ; déduit par `fallbackMediaType`.
  media_type?: string;
  title?: string;
  name?: string;
  /** Titres en langue d'origine (utiles au rapprochement d'imports non localisés). */
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
}

export interface TmdbTvDetails {
  seasons: { season_number: number; episode_count: number }[];
}

export interface TmdbSeasonDetails {
  episodes: {
    season_number: number;
    episode_number: number;
    name?: string;
    runtime?: number | null;
    air_date?: string | null;
  }[];
}

/** Fiche épisode (`/tv/{id}/season/{s}/episode/{e}?append_to_response=credits`). */
export interface TmdbEpisodeDetails {
  season_number: number;
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string | null;
  runtime?: number | null;
  still_path?: string | null;
  vote_average?: number;
  credits?: TmdbCredits;
  guest_stars?: TmdbCastMember[];
}

// --- Fiche détaillée (append_to_response=credits,watch/providers) ---

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCompany {
  name: string;
  logo_path?: string | null;
}

export interface TmdbCastMember {
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface TmdbCrewMember {
  name: string;
  job?: string;
}

export interface TmdbCredits {
  cast?: TmdbCastMember[];
  crew?: TmdbCrewMember[];
}

export interface TmdbProviderEntry {
  provider_name: string;
  logo_path?: string | null;
}

export interface TmdbWatchProviderRegion {
  flatrate?: TmdbProviderEntry[];
  rent?: TmdbProviderEntry[];
  buy?: TmdbProviderEntry[];
}

export interface TmdbWatchProviders {
  results?: Record<string, TmdbWatchProviderRegion | undefined>;
}

export interface TmdbMovieDetailsFull {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  status?: string;
  runtime?: number | null;
  genres?: TmdbGenre[];
  production_companies?: TmdbCompany[];
  credits?: TmdbCredits;
  "watch/providers"?: TmdbWatchProviders;
}

export interface TmdbTvDetailsFull {
  id: number;
  name?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  first_air_date?: string;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  genres?: TmdbGenre[];
  production_companies?: TmdbCompany[];
  created_by?: { name: string }[];
  credits?: TmdbCredits;
  "watch/providers"?: TmdbWatchProviders;
}
