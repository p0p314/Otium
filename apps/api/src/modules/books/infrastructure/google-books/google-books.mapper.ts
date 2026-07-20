import type { BookRecord } from "../../domain";
import { isIsbn, normalizeIsbn } from "../../domain";
import type { GoogleImageLinks, GoogleVolume } from "./google-books.types";

export const GOOGLE_BOOKS_SOURCE = "google-books";

/** Chaîne exploitable, ou `null` : une chaîne vide n'est pas une donnée. */
function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Google sert ses images en HTTP et bride la taille via `zoom`. On force HTTPS (contenu
 * mixte bloqué par le navigateur) et on retire `edge=curl` (ombre décorative parasite).
 */
function image(url: string | undefined): string | null {
  const value = text(url);
  return value ? value.replace(/^http:/, "https:").replace(/&edge=curl/, "") : null;
}

/** Meilleure résolution disponible, du plus grand au plus petit. */
function largestCover(links: GoogleImageLinks | undefined): string | null {
  return (
    image(links?.extraLarge) ??
    image(links?.large) ??
    image(links?.medium) ??
    image(links?.small) ??
    image(links?.thumbnail)
  );
}

/** Identifiant du type demandé, seulement s'il est structurellement valide. */
function isbn(volume: GoogleVolume, type: "ISBN_10" | "ISBN_13"): string | null {
  const found = volume.volumeInfo?.industryIdentifiers?.find((i) => i.type === type)?.identifier;
  const value = found ? normalizeIsbn(found) : null;
  return value && isIsbn(value) ? value : null;
}

/**
 * Convertit un volume Google Books vers le modèle normalisé. Renvoie `null` si le volume
 * n'a ni identifiant ni titre : une fiche sans identité n'est pas exploitable.
 */
export function toBookRecord(volume: GoogleVolume): BookRecord | null {
  const id = text(volume.id);
  const info = volume.volumeInfo;
  const title = text(info?.title);
  if (!id || !title) return null;

  return {
    externalId: id,
    source: GOOGLE_BOOKS_SOURCE,
    title,
    subtitle: text(info?.subtitle),
    authors: info?.authors?.map((a) => a.trim()).filter(Boolean) ?? [],
    description: text(info?.description),
    coverUrl: image(info?.imageLinks?.thumbnail) ?? largestCover(info?.imageLinks),
    coverUrlLarge: largestCover(info?.imageLinks),
    categories: info?.categories?.map((c) => c.trim()).filter(Boolean) ?? [],
    publishedDate: text(info?.publishedDate),
    pageCount: info?.pageCount && info.pageCount > 0 ? info.pageCount : null,
    language: text(info?.language)?.toLowerCase() ?? null,
    publisher: text(info?.publisher),
    isbn10: isbn(volume, "ISBN_10"),
    isbn13: isbn(volume, "ISBN_13"),
    googleBooksId: id,
    openLibraryId: null,
    infoUrl: text(info?.infoLink),
    // L'aperçu n'a de sens que si le volume en propose un (`viewability` ≠ NONE).
    previewUrl:
      volume.accessInfo?.viewability && volume.accessInfo.viewability !== "NONE"
        ? text(info?.previewLink)
        : null,
    // Google note sur 5 ; Otium raisonne sur 10 partout (contrat `Rating`).
    averageRating: info?.averageRating != null ? info.averageRating * 2 : null,
    ratingsCount: info?.ratingsCount ?? null,
    sources: [GOOGLE_BOOKS_SOURCE],
  };
}
