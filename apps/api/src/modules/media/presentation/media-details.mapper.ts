import type { EpisodeDetails, MediaDetails } from "@otium/types";
import type { CatalogBookDetails, CatalogEpisodeDetails, CatalogMediaDetails } from "../domain";

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
    book: details.book ? toBookDetailsDto(details.book) : null,
  };
}

/** Regroupe les identifiants du livre dans le sous-objet attendu par le contrat. */
function toBookDetailsDto(book: CatalogBookDetails): NonNullable<MediaDetails["book"]> {
  return {
    subtitle: book.subtitle,
    authors: [...book.authors],
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    pageCount: book.pageCount,
    language: book.language,
    identifiers: {
      isbn10: book.isbn10,
      isbn13: book.isbn13,
      googleBooksId: book.googleBooksId,
      openLibraryId: book.openLibraryId,
    },
    infoUrl: book.infoUrl,
    previewUrl: book.previewUrl,
    sources: [...book.sources],
    collection: book.collection ? { ...book.collection } : null,
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
