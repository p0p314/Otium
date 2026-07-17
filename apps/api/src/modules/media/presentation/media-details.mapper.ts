import type { EpisodeDetails, MediaDetails } from "@otium/types";
import type { CatalogEpisodeDetails, CatalogMediaDetails } from "../domain";

/** Convertit la fiche détaillée du domaine vers le DTO de contrat partagé. */
export function toMediaDetailsDto(details: CatalogMediaDetails): MediaDetails {
  return {
    externalRef: { ...details.externalRef },
    type: details.type,
    title: details.title,
    originalTitle: details.originalTitle,
    posterUrl: details.posterUrl,
    backdropUrl: details.backdropUrl,
    overview: details.overview,
    genres: details.genres.map((g) => ({ id: g.id, label: g.label })),
    rating: details.rating,
    voteCount: details.voteCount,
    releaseDate: details.releaseDate,
    year: details.year,
    status: details.status,
    runtimeMinutes: details.runtimeMinutes,
    numberOfSeasons: details.numberOfSeasons,
    numberOfEpisodes: details.numberOfEpisodes,
    cast: details.cast.map((c) => ({ ...c })),
    directors: [...details.directors],
    productionCompanies: details.productionCompanies.map((c) => ({ ...c })),
    watchProviders: details.watchProviders.map((p) => ({ ...p })),
  };
}

/** Convertit la fiche détaillée d'un épisode vers le DTO de contrat partagé. */
export function toEpisodeDetailsDto(episode: CatalogEpisodeDetails): EpisodeDetails {
  return {
    seasonNumber: episode.seasonNumber,
    number: episode.number,
    title: episode.title,
    overview: episode.overview,
    airDate: episode.airDate,
    runtimeMinutes: episode.runtimeMinutes,
    stillUrl: episode.stillUrl,
    rating: episode.rating,
    cast: episode.cast.map((c) => ({ ...c })),
  };
}
