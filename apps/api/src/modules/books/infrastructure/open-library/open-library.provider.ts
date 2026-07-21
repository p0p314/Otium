import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../../shared/infrastructure/config/env";
import { HttpClient } from "../../../../shared/infrastructure/http/http-client";
import type { BookProvider, BookRecord, BookSearchPage, BookSearchParams } from "../../domain";
import { parseIsbn } from "../../domain";
import { coverUrl, OPEN_LIBRARY_SOURCE, toBookRecord, toDescription } from "./open-library.mapper";
import type {
  OpenLibrarySearchResponse,
  OpenLibraryWork,
} from "./open-library.types";

/** Champs demandés explicitement : Open Library renvoie sinon un document très large. */
const SEARCH_FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_name",
  "first_publish_year",
  "publisher",
  "number_of_pages_median",
  "language",
  "isbn",
  "cover_i",
  "subject",
  "first_sentence",
].join(",");

/**
 * Adapter Open Library du port `BookProvider` — **source de secours** (ADR-0016). N'est
 * jamais interrogé quand Google Books suffit : chaque appel évité est un appel réseau de
 * moins (éco-conception).
 */
@Injectable()
export class OpenLibraryProvider implements BookProvider {
  readonly name = OPEN_LIBRARY_SOURCE;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly http: HttpClient,
  ) {}

  async searchBooks(params: BookSearchParams): Promise<BookSearchPage> {
    const isbn = parseIsbn(params.query);
    const search = new URLSearchParams({
      ...(isbn ? { isbn } : this.queryParam(params)),
      fields: SEARCH_FIELDS,
      page: String(params.page),
      limit: String(params.pageSize),
    });
    const raw = await this.get<OpenLibrarySearchResponse>(`/search.json?${search.toString()}`);
    return {
      items: (raw.docs ?? []).map(toBookRecord).filter((b): b is BookRecord => b !== null),
      total: raw.numFound ?? 0,
    };
  }

  /** Open Library expose des champs dédiés : les employer vaut mieux qu'une requête libre. */
  private queryParam(params: BookSearchParams): Record<string, string> {
    const value = params.query.trim();
    if (params.field === "AUTHOR") return { author: value };
    if (params.field === "TITLE") return { title: value };
    return { q: value };
  }

  /**
   * `externalId` est une clé d'œuvre (`/works/OL45804W`). La fiche d'œuvre porte la
   * description — absente de la recherche — d'où cet appel dédié.
   */
  async getByExternalId(externalId: string): Promise<BookRecord | null> {
    const key = externalId.startsWith("/") ? externalId : `/works/${externalId}`;
    const [work, fromSearch] = await Promise.all([
      this.get<OpenLibraryWork>(`${key}.json`).catch(() => null),
      this.firstMatch(key),
    ]);
    if (!work && !fromSearch) return null;
    if (!fromSearch) return this.fromWork(key, work as OpenLibraryWork);
    return {
      ...fromSearch,
      description: toDescription(work?.description) ?? fromSearch.description,
    };
  }

  async findByIsbn(isbn: string): Promise<BookRecord | null> {
    const page = await this.searchBooks({ query: isbn, page: 1, pageSize: 1 });
    return page.items[0] ?? null;
  }

  /** Retrouve le document de recherche correspondant à une œuvre (métadonnées riches). */
  private async firstMatch(key: string): Promise<BookRecord | null> {
    const search = new URLSearchParams({ q: `key:${key}`, fields: SEARCH_FIELDS, limit: "1" });
    const raw = await this.get<OpenLibrarySearchResponse>(`/search.json?${search.toString()}`);
    const doc = raw.docs?.[0];
    return doc ? toBookRecord(doc) : null;
  }

  /** Repli minimal quand seule la fiche d'œuvre répond (recherche muette). */
  private fromWork(key: string, work: OpenLibraryWork): BookRecord | null {
    const title = work.title?.trim();
    if (!title) return null;
    return {
      externalId: key,
      source: OPEN_LIBRARY_SOURCE,
      title,
      subtitle: work.subtitle?.trim() || null,
      authors: [],
      description: toDescription(work.description),
      coverUrl: coverUrl(work.covers?.[0], "M"),
      coverUrlLarge: coverUrl(work.covers?.[0], "L"),
      categories: (work.subjects ?? []).slice(0, 5),
      publishedDate: null,
      pageCount: null,
      language: null,
      publisher: null,
      isbn10: null,
      isbn13: null,
      googleBooksId: null,
      openLibraryId: key,
      infoUrl: `https://openlibrary.org${key}`,
      previewUrl: null,
      averageRating: null,
      ratingsCount: null,
      sources: [OPEN_LIBRARY_SOURCE],
      series: null,
    };
  }

  private get<T>(path: string): Promise<T> {
    const baseUrl = this.config.get("OPEN_LIBRARY_API_BASE_URL", { infer: true });
    return this.http.getJson<T>(`${baseUrl}${path}`, { Accept: "application/json" });
  }
}
