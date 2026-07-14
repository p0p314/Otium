import {
  type AddToLibraryInput,
  AuthSession,
  AuthUser,
  LibraryItem,
  type LoginInput,
  type MarkEpisodeInput,
  type RegisterInput,
  type SearchMediaQuery,
  SearchMediaResult,
  SeriesTracking,
  type ToggleFavoriteInput,
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
    // `fetch` doit être appelé avec `this === window` dans les navigateurs ; sans binding,
    // l'appel via `this.fetchImpl(...)` lève « 'fetch' called on an object that does not
    // implement interface Window ». On lie donc le fetch global par défaut à globalThis.
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
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

  // --- Authentification ---

  async register(input: RegisterInput): Promise<AuthSession> {
    return this.request("/auth/register", AuthSession, { method: "POST", body: input });
  }

  async login(input: LoginInput): Promise<AuthSession> {
    return this.request("/auth/login", AuthSession, { method: "POST", body: input });
  }

  async me(): Promise<AuthUser> {
    return this.request("/auth/me", AuthUser);
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", z.void(), { method: "POST" });
  }

  async getLibrary(): Promise<LibraryItem[]> {
    return this.request("/library", z.array(LibraryItem));
  }

  async addToLibrary(input: AddToLibraryInput): Promise<LibraryItem> {
    return this.request("/library", LibraryItem, { method: "POST", body: input });
  }

  async removeFromLibrary(itemId: string): Promise<void> {
    await this.request(`/library/${itemId}`, z.void(), { method: "DELETE" });
  }

  async toggleFavorite(itemId: string, input: ToggleFavoriteInput): Promise<LibraryItem> {
    return this.request(`/library/${itemId}/favorite`, LibraryItem, {
      method: "PATCH",
      body: input,
    });
  }

  // --- Suivi de séries ---

  async getSeriesTracking(itemId: string): Promise<SeriesTracking> {
    return this.request(`/library/${itemId}/series`, SeriesTracking);
  }

  async markEpisode(itemId: string, input: MarkEpisodeInput): Promise<SeriesTracking> {
    return this.request(`/library/${itemId}/episodes`, SeriesTracking, {
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
