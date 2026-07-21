import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../../shared/infrastructure/config/env";
import { HttpClient } from "../../../../shared/infrastructure/http/http-client";
import type { BookProvider, BookRecord, BookSearchPage, BookSearchParams } from "../../domain";
import { parseIsbn } from "../../domain";
import { GOOGLE_BOOKS_SOURCE, toBookRecord } from "./google-books.mapper";
import type { GoogleVolume, GoogleVolumesResponse } from "./google-books.types";

/** Plafond imposé par l'API (`maxResults` ≤ 40). */
const MAX_RESULTS = 40;

/**
 * Adapter Google Books du port `BookProvider` — **source prioritaire** (ADR-0016).
 * Traduit la requête utilisateur en syntaxe Google (`isbn:`, `intitle:`, `inauthor:`) et
 * normalise la réponse. La tolérance aux fautes de frappe est assurée nativement par
 * Google : aucune correction locale n'est nécessaire.
 */
@Injectable()
export class GoogleBooksProvider implements BookProvider {
  readonly name = GOOGLE_BOOKS_SOURCE;
  private readonly logger = new Logger(GoogleBooksProvider.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly http: HttpClient,
  ) {}

  async searchBooks(params: BookSearchParams): Promise<BookSearchPage> {
    const raw = await this.get<GoogleVolumesResponse>("/volumes", {
      q: this.toGoogleQuery(params.query, params.field),
      startIndex: String((params.page - 1) * params.pageSize),
      maxResults: String(Math.min(params.pageSize, MAX_RESULTS)),
      // `books` exclut les magazines : un catalogue de suivi de lecture n'en veut pas.
      printType: "books",
    });
    return {
      items: (raw.items ?? []).map(toBookRecord).filter((b): b is BookRecord => b !== null),
      total: raw.totalItems ?? 0,
    };
  }

  async getByExternalId(externalId: string): Promise<BookRecord | null> {
    try {
      const volume = await this.get<GoogleVolume>(`/volumes/${encodeURIComponent(externalId)}`, {});
      return toBookRecord(volume);
    } catch (error) {
      // Un volume retiré du catalogue renvoie 404 : absence de données, pas une panne.
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async findByIsbn(isbn: string): Promise<BookRecord | null> {
    const page = await this.searchBooks({ query: `isbn:${isbn}`, page: 1, pageSize: 1 });
    return page.items[0] ?? null;
  }

  /**
   * Traduit la saisie vers la syntaxe de recherche Google. Un ISBN déclenche une
   * recherche exacte ; un opérateur déjà présent (`intitle:`…) est respecté tel quel ;
   * sinon, la recherche reste libre — c'est elle qui tolère le mieux les fautes de frappe.
   */
  private toGoogleQuery(query: string, field?: BookSearchParams["field"]): string {
    const trimmed = query.trim();
    const isbn = parseIsbn(trimmed);
    // Un ISBN prime sur tout : c'est une identité, pas un critère de champ.
    if (isbn) return `isbn:${isbn}`;
    // Les guillemets évitent que « Frank Herbert » soit compris comme deux critères.
    if (field === "AUTHOR") return `inauthor:"${trimmed}"`;
    if (field === "TITLE") return `intitle:"${trimmed}"`;
    return trimmed;
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const baseUrl = this.config.get("GOOGLE_BOOKS_API_BASE_URL", { infer: true });
    const search = new URLSearchParams(params);
    // La langue d'interface influe sur les catégories/descriptions retournées.
    search.set("langRestrict", "fr");
    search.set("country", "FR");
    const apiKey = this.config.get("GOOGLE_BOOKS_API_KEY", { infer: true });
    // Clé facultative : sans elle, l'API reste utilisable avec un quota anonyme plus bas.
    if (apiKey) search.set("key", apiKey);
    return this.http.getJson<T>(
      `${baseUrl}${path}?${search.toString()}`,
      { Accept: "application/json" },
      // Google Books renvoie fréquemment des `503 backendFailed` purement transitoires
      // (constaté ~1 requête sur 3 en conditions réelles). Deux nouvelles tentatives
      // suffisent à rattraper l'essentiel ; au-delà, Open Library prend le relais.
      { retries: 2 },
    );
  }

  private isNotFound(error: unknown): boolean {
    const status = (error as { status?: number }).status;
    if (status === 404) return true;
    this.logger.debug(`Google Books a répondu ${status ?? "?"}`);
    return false;
  }
}
