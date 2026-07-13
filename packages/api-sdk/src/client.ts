import {
  type AddToLibraryInput,
  LibraryItem,
  type MarkEpisodeWatchedInput,
  type RateMediaInput,
  type SearchMediaQuery,
  SearchMediaResult,
} from "@otium/types";
import { z } from "zod";
import { ApiError } from "./errors.js";

export interface OtiumClientOptions {
  /** URL de base de l'API, ex. "http://localhost:3000". */
  baseUrl: string;
  /** `fetch` injectable (tests, environnements sans global fetch). */
  fetch?: typeof globalThis.fetch;
  /** Fournit un jeton d'auth par requête (session). */
  getToken?: () => string | null | undefined;
}

/**
 * Client HTTP typé de l'API Otium. **Seul** point d'accès du frontend à l'API
 * (voir CLAUDE.md — aucune app n'appelle l'API autrement).
 */
export class OtiumClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly getToken: (() => string | null | undefined) | undefined;

  constructor(options: OtiumClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.getToken = options.getToken;
  }

  async searchMedia(query: SearchMediaQuery): Promise<SearchMediaResult> {
    const params = new URLSearchParams({
      q: query.q,
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.type) params.set("type", query.type);
    return this.request(`/media/search?${params.toString()}`, SearchMediaResult);
  }

  async getLibrary(): Promise<LibraryItem[]> {
    return this.request("/library", z.array(LibraryItem));
  }

  async addToLibrary(input: AddToLibraryInput): Promise<LibraryItem> {
    return this.request("/library", LibraryItem, { method: "POST", body: input });
  }

  async rateMedia(itemId: string, input: RateMediaInput): Promise<LibraryItem> {
    return this.request(`/library/${itemId}/rating`, LibraryItem, { method: "PUT", body: input });
  }

  async markEpisodeWatched(itemId: string, input: MarkEpisodeWatchedInput): Promise<LibraryItem> {
    return this.request(`/library/${itemId}/episodes`, LibraryItem, {
      method: "PATCH",
      body: input,
    });
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    const token = this.getToken?.();
    const requestInit: RequestInit = {
      method: init?.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
    if (init?.body !== undefined) {
      requestInit.body = JSON.stringify(init.body);
    }
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, requestInit);

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new ApiError(response.status, `Requête ${path} échouée`, payload);
    }
    return schema.parse(payload);
  }
}
