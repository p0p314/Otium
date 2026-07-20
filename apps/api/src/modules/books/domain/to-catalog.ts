import type { CatalogMedia, CatalogMediaDetails } from "../../media/domain";
import { type BookRecord, publicationYear } from "./models/book";

/**
 * Traduction du modèle « livre » vers le modèle **générique** du catalogue. C'est ici que
 * les livres rejoignent le tronc commun d'Otium : au-delà de cette frontière, un livre est
 * un `Media` comme un autre (ADR-0003).
 */

/** Identifiant du catalogue livres tel qu'exposé dans les références externes. */
export const BOOKS_PROVIDER = "books";

export function toCatalogMedia(book: BookRecord): CatalogMedia {
  return {
    externalRef: { provider: BOOKS_PROVIDER, externalId: book.externalId },
    type: "BOOK",
    title: book.title,
    // Les livres n'ont pas de « titre original » distinct chez nos sources : le
    // sous-titre occupe ce champ, utile au rapprochement comme à l'affichage.
    originalTitle: book.subtitle,
    year: publicationYear(book.publishedDate),
    posterUrl: book.coverUrl,
    // Les catégories tiennent lieu de genres : le libellé sert d'identifiant, faute
    // d'identifiants stables côté sources.
    genres: book.categories.map((label) => ({ id: label, label })),
  };
}

export function toCatalogMediaDetails(book: BookRecord): CatalogMediaDetails {
  return {
    externalRef: { provider: BOOKS_PROVIDER, externalId: book.externalId },
    type: "BOOK",
    title: book.title,
    originalTitle: book.subtitle,
    posterUrl: book.coverUrlLarge ?? book.coverUrl,
    // Pas d'image d'arrière-plan chez les sources de livres : la fiche s'adapte.
    backdropUrl: null,
    overview: book.description,
    genres: book.categories.map((label) => ({ id: label, label })),
    rating: book.averageRating,
    voteCount: book.ratingsCount ?? 0,
    releaseDate: book.publishedDate,
    year: publicationYear(book.publishedDate),
    status: null,
    runtimeMinutes: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    cast: [],
    // `directors` porte les auteurs : le champ générique « qui a fait l'œuvre ».
    directors: [...book.authors],
    productionCompanies: book.publisher ? [{ name: book.publisher, logoUrl: null }] : [],
    watchProviders: [],
    book: {
      subtitle: book.subtitle,
      authors: [...book.authors],
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      pageCount: book.pageCount,
      language: book.language,
      isbn10: book.isbn10,
      isbn13: book.isbn13,
      googleBooksId: book.googleBooksId,
      openLibraryId: book.openLibraryId,
      infoUrl: book.infoUrl,
      previewUrl: book.previewUrl,
      coverUrlLarge: book.coverUrlLarge,
      sources: [...book.sources],
      collection: book.series
        ? { id: book.series.id, provider: book.series.source, position: book.series.position }
        : null,
    },
  };
}
