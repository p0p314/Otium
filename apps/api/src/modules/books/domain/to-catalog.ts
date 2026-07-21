import type { CatalogMedia, CatalogMediaDetails } from "../../media/domain";
import { type BookRecord, publicationYear } from "./models/book";
import { BOOKS_PROVIDER, providerSeriesKey } from "./collection-identity";
import { parseVolumeTitle } from "./volume-title";

/**
 * Traduction du modèle « livre » vers le modèle **générique** du catalogue. C'est ici que
 * les livres rejoignent le tronc commun d'Otium : au-delà de cette frontière, un livre est
 * un `Media` comme un autre (ADR-0003).
 */

/** Réexport : les appelants historiques importent ce jeton depuis ce module. */
export { BOOKS_PROVIDER };

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
        ? {
            // Même identité que celle produite au regroupement : sans quoi la fiche
            // d'œuvre atteinte depuis la recherche ne retrouverait rien en base.
            id: providerSeriesKey(book.series.source, book.series.id),
            provider: BOOKS_PROVIDER,
            // Le titre de l'œuvre se lit dans celui du volume, amputé de son numéro.
            title: parseVolumeTitle(book.title).baseTitle || book.title,
            method: "PROVIDER_SERIES",
            position: book.series.position ?? parseVolumeTitle(book.title).position,
          }
        : null,
    },
  };
}
