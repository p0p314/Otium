import type { BookRecord } from "../../domain";
import { isIsbn, normalizeIsbn } from "../../domain";
import type { OpenLibraryDescription, OpenLibraryDoc } from "./open-library.types";

export const OPEN_LIBRARY_SOURCE = "open-library";

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Open Library expose la description tantôt en chaîne, tantôt en objet `{ value }`. */
export function toDescription(description: OpenLibraryDescription | undefined): string | null {
  if (!description) return null;
  return typeof description === "string" ? text(description) : text(description.value);
}

/** URL de couverture dérivée de l'identifiant d'image (`L` = grand format). */
export function coverUrl(coverId: number | undefined, size: "M" | "L"): string | null {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null;
}

/** Premier ISBN valide de la longueur demandée parmi ceux listés. */
function pickIsbn(isbns: readonly string[] | undefined, length: 10 | 13): string | null {
  const found = (isbns ?? [])
    .map(normalizeIsbn)
    .find((value) => value.length === length && isIsbn(value));
  return found ?? null;
}

/**
 * Convertit un document de recherche Open Library vers le modèle normalisé. Open Library
 * n'expose ni note moyenne ni lien d'aperçu exploitables : ces champs restent `null` et
 * seront comblés par la source prioritaire si elle les connaît.
 */
export function toBookRecord(doc: OpenLibraryDoc): BookRecord | null {
  const key = text(doc.key);
  const title = text(doc.title);
  if (!key || !title) return null;

  const year = doc.first_publish_year;
  return {
    externalId: key,
    source: OPEN_LIBRARY_SOURCE,
    title,
    subtitle: text(doc.subtitle),
    authors: doc.author_name?.map((a) => a.trim()).filter(Boolean) ?? [],
    // La recherche ne renvoie pas la description ; seule la fiche d'œuvre la porte.
    description: doc.first_sentence?.[0]?.trim() || null,
    coverUrl: coverUrl(doc.cover_i, "M"),
    coverUrlLarge: coverUrl(doc.cover_i, "L"),
    // Les « subjects » sont nombreux et bruités : on borne pour rester lisible.
    categories: (doc.subject ?? []).slice(0, 5),
    publishedDate: year ? String(year) : null,
    pageCount: doc.number_of_pages_median ?? null,
    language: toIso639_1(doc.language?.[0]),
    publisher: text(doc.publisher?.[0]),
    isbn10: pickIsbn(doc.isbn, 10),
    isbn13: pickIsbn(doc.isbn, 13),
    googleBooksId: null,
    openLibraryId: key,
    infoUrl: `https://openlibrary.org${key}`,
    previewUrl: null,
    averageRating: null,
    ratingsCount: null,
    sources: [OPEN_LIBRARY_SOURCE],
  };
}

/** Open Library utilise des codes ISO 639-2 (`fre`, `eng`) ; Otium parle ISO 639-1. */
const ISO_639_2_TO_1: Record<string, string> = {
  fre: "fr",
  fra: "fr",
  eng: "en",
  spa: "es",
  ger: "de",
  deu: "de",
  ita: "it",
  por: "pt",
  jpn: "ja",
  rus: "ru",
};

function toIso639_1(code: string | undefined): string | null {
  const value = text(code)?.toLowerCase();
  if (!value) return null;
  return value.length === 2 ? value : (ISO_639_2_TO_1[value] ?? null);
}
