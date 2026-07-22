import { normalizeIsbn } from "./isbn";
import { type BookRecord, publicationYear } from "./models/book";

/**
 * Décide si un livre saisi par un utilisateur et un livre de catalogue désignent le
 * **même ouvrage** (règles pures, sans I/O).
 *
 * L'enjeu n'est pas de rapprocher le plus possible, mais de ne **jamais** rapprocher à
 * tort. Une association erronée remplacerait le livre d'un utilisateur par un autre —
 * en emportant sa note, son avis et sa progression sous un titre qui n'est pas le sien.
 * Le coût d'un rapprochement manqué, lui, est nul : le livre reste tel qu'il a été saisi
 * et sera réexaminé à la prochaine échéance.
 *
 * En cas de doute, on ne rapproche pas.
 */

/** Degré de certitude du rapprochement. Seul `CERTAIN` autorise l'association. */
export type MatchConfidence = "CERTAIN" | "PROBABLE" | "REJECTED";

export interface MatchVerdict {
  readonly confidence: MatchConfidence;
  /** Ce qui a fondé la décision — journalisé, donc auditable après coup. */
  readonly reason: string;
}

/** Écart d'année toléré : les catalogues datent souvent l'édition, pas l'œuvre. */
const YEAR_TOLERANCE = 1;

export function matchCommunityBook(own: BookRecord, candidate: BookRecord): MatchVerdict {
  const ownIsbn = isbnOf(own);
  const candidateIsbn = isbnOf(candidate);

  // Un ISBN identique est une identité, pas une ressemblance : c'est le seul signal qui
  // se suffit à lui-même.
  if (ownIsbn && candidateIsbn) {
    return ownIsbn === candidateIsbn
      ? { confidence: "CERTAIN", reason: `ISBN identique (${ownIsbn})` }
      : { confidence: "REJECTED", reason: "ISBN différents" };
  }

  if (!sameTitle(own.title, candidate.title)) {
    return { confidence: "REJECTED", reason: "titres différents" };
  }

  // Le titre seul ne suffit jamais : « Dune » désigne le roman, un mook, un guide…
  if (!sameAuthor(own, candidate)) {
    return { confidence: "REJECTED", reason: "auteur absent ou différent" };
  }

  const yearVerdict = compareYears(own, candidate);
  if (yearVerdict) return yearVerdict;

  return {
    confidence: "CERTAIN",
    reason: "titre et auteur identiques, année compatible",
  };
}

/** ISBN-13 de préférence ; l'ISBN-10 sert de repli. */
function isbnOf(book: BookRecord): string | null {
  const raw = book.isbn13 ?? book.isbn10;
  return raw ? normalizeIsbn(raw) : null;
}

function sameTitle(a: string, b: string): boolean {
  const left = normalize(a);
  const right = normalize(b);
  return left !== "" && left === right;
}

/**
 * Au moins un auteur en commun. Un livre communautaire **sans auteur** ne peut pas être
 * rapproché : il ne resterait que le titre, et deux ouvrages homonymes existent.
 */
function sameAuthor(own: BookRecord, candidate: BookRecord): boolean {
  if (own.authors.length === 0 || candidate.authors.length === 0) return false;
  const theirs = new Set(candidate.authors.map(normalize));
  return own.authors.map(normalize).some((author) => author !== "" && theirs.has(author));
}

/** Années incompatibles = rejet ; année inconnue d'un côté = pas un motif de rejet. */
function compareYears(own: BookRecord, candidate: BookRecord): MatchVerdict | null {
  const ownYear = publicationYear(own.publishedDate);
  const candidateYear = publicationYear(candidate.publishedDate);
  if (ownYear === null || candidateYear === null) return null;
  return Math.abs(ownYear - candidateYear) <= YEAR_TOLERANCE
    ? null
    : { confidence: "REJECTED", reason: `années éloignées (${ownYear} / ${candidateYear})` };
}

/** Casse, accents et ponctuation ne doivent pas distinguer deux fois le même texte. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
