/** Sous-ensemble des réponses TMDB utilisées par l'adapter (search/multi). */
export interface TmdbSearchResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbSearchItem[];
}

export interface TmdbSearchItem {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
}
