import {
  type AddToLibraryInput,
  type AddToListInput,
  AuthSession,
  AuthUser,
  type ChangePasswordInput,
  type CreateListInput,
  HomeDashboard,
  ImportReport,
  LibraryItem,
  ListDetail,
  ListSummary,
  type LoginInput,
  type RenameListInput,
  type MarkEpisodeInput,
  type MarkEpisodesInput,
  MediaDetails,
  type MediaType,
  type RateMediaInput,
  type RegisterInput,
  Review,
  ReviewResponse,
  type SaveReviewInput,
  type SearchMediaQuery,
  SearchMediaResult,
  SeriesTracking,
  type SetWatchStatusInput,
  type ToggleFavoriteInput,
  type TrendingMediaQuery,
  type UpdateProfileInput,
  UpcomingDashboard,
  ViewingStats,
} from "@otium/types";
import { z } from "zod";
import { ApiError } from "./errors.js";

export interface OtiumClientOptions {
  /** URL de base de l'API, ex. "http://localhost:3000". */
  baseUrl: string;
  /** `fetch` injectable (tests, environnements sans global fetch). */
  fetch?: typeof globalThis.fetch;
  /**
   * Fournit un jeton d'auth par requête (session), en repli du cookie httpOnly.
   * Optionnel : le web s'appuie sur le cookie ; les clients mobiles fournissent le jeton.
   */
  getToken?: () => string | null | undefined;
  /**
   * Appelé quand une requête renvoie 401 : la session (cookie/jeton) est absente ou
   * expirée. Permet au web de purger l'état local « connecté » désynchronisé et de
   * rediriger vers la connexion. Non déclenché pour la connexion/inscription elles-mêmes.
   */
  onUnauthorized?: () => void;
}

/**
 * Client HTTP typé de l'API Otium. **Seul** point d'accès du frontend à l'API
 * (voir CLAUDE.md — aucune app n'appelle l'API autrement).
 */
export class OtiumClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly getToken: (() => string | null | undefined) | undefined;
  private readonly onUnauthorized: (() => void) | undefined;

  constructor(options: OtiumClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    // `fetch` doit être appelé avec `this === window` dans les navigateurs ; sans binding,
    // l'appel via `this.fetchImpl(...)` lève « 'fetch' called on an object that does not
    // implement interface Window ». On lie donc le fetch global par défaut à globalThis.
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.getToken = options.getToken;
    this.onUnauthorized = options.onUnauthorized;
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

  async getTrending(query: TrendingMediaQuery): Promise<SearchMediaResult> {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.type) params.set("type", query.type);
    return this.request(`/media/trending?${params.toString()}`, SearchMediaResult);
  }

  async getMediaDetails(type: MediaType, externalId: string): Promise<MediaDetails> {
    return this.request(`/media/${type}/${encodeURIComponent(externalId)}`, MediaDetails);
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

  /** Met à jour le profil (nom affiché et/ou e-mail). */
  async updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
    return this.request("/auth/me", AuthUser, { method: "PATCH", body: input });
  }

  /** Change le mot de passe (l'actuel est vérifié côté serveur). */
  async changePassword(input: ChangePasswordInput): Promise<void> {
    await this.request("/auth/password", z.void(), { method: "PUT", body: input });
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", z.void(), { method: "POST" });
  }

  async getLibrary(): Promise<LibraryItem[]> {
    return this.request("/library", z.array(LibraryItem));
  }

  async getHomeDashboard(): Promise<HomeDashboard> {
    return this.request("/library/home", HomeDashboard);
  }

  /** Agenda « À venir » : épisodes à diffusion future des séries suivies. */
  async getUpcoming(): Promise<UpcomingDashboard> {
    return this.request("/library/upcoming", UpcomingDashboard);
  }

  async getViewingStats(): Promise<ViewingStats> {
    return this.request("/stats", ViewingStats);
  }

  /** Importe un export RGPD TV Time (archive ZIP) et retourne le rapport d'import. */
  async importTvTime(archive: Blob): Promise<ImportReport> {
    const form = new FormData();
    form.append("file", archive, "tvtime.zip");
    return this.request("/import/tvtime", ImportReport, { method: "POST", form });
  }

  async getLibraryItem(itemId: string): Promise<LibraryItem> {
    return this.request(`/library/${itemId}`, LibraryItem);
  }

  async rateMedia(itemId: string, input: RateMediaInput): Promise<LibraryItem> {
    return this.request(`/library/${itemId}/rating`, LibraryItem, { method: "PATCH", body: input });
  }

  async getReview(itemId: string): Promise<Review | null> {
    const { review } = await this.request(`/library/${itemId}/review`, ReviewResponse);
    return review;
  }

  async saveReview(itemId: string, input: SaveReviewInput): Promise<Review> {
    return this.request(`/library/${itemId}/review`, Review, { method: "PUT", body: input });
  }

  async deleteReview(itemId: string): Promise<void> {
    await this.request(`/library/${itemId}/review`, z.void(), { method: "DELETE" });
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

  async setWatchStatus(itemId: string, input: SetWatchStatusInput): Promise<LibraryItem> {
    return this.request(`/library/${itemId}/status`, LibraryItem, {
      method: "PATCH",
      body: input,
    });
  }

  // --- Listes personnalisées ---

  async getLists(): Promise<ListSummary[]> {
    return this.request("/lists", z.array(ListSummary));
  }

  async getList(listId: string): Promise<ListDetail> {
    return this.request(`/lists/${listId}`, ListDetail);
  }

  async createList(input: CreateListInput): Promise<ListSummary> {
    return this.request("/lists", ListSummary, { method: "POST", body: input });
  }

  async renameList(listId: string, input: RenameListInput): Promise<ListSummary> {
    return this.request(`/lists/${listId}`, ListSummary, { method: "PATCH", body: input });
  }

  async deleteList(listId: string): Promise<void> {
    await this.request(`/lists/${listId}`, z.void(), { method: "DELETE" });
  }

  async addToList(listId: string, input: AddToListInput): Promise<ListDetail> {
    return this.request(`/lists/${listId}/items`, ListDetail, { method: "POST", body: input });
  }

  async removeFromList(
    listId: string,
    externalRef: { provider: string; externalId: string },
  ): Promise<ListDetail> {
    return this.request(
      `/lists/${listId}/items/${encodeURIComponent(externalRef.provider)}/${encodeURIComponent(externalRef.externalId)}`,
      ListDetail,
      { method: "DELETE" },
    );
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

  async markEpisodes(itemId: string, input: MarkEpisodesInput): Promise<SeriesTracking> {
    return this.request(`/library/${itemId}/episodes/batch`, SeriesTracking, {
      method: "PATCH",
      body: input,
    });
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: { method?: string; body?: unknown; form?: FormData },
  ): Promise<T> {
    const token = this.getToken?.();
    const requestInit: RequestInit = {
      method: init?.method ?? "GET",
      // Envoie le cookie de session httpOnly (navigateur). Le Bearer reste un repli
      // pour les clients non-navigateur (mobile) via `getToken`.
      credentials: "include",
      headers: {
        // Pour un envoi multipart (FormData), on laisse le navigateur poser le
        // content-type avec la bonne frontière (boundary).
        ...(init?.form ? {} : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
    if (init?.form !== undefined) {
      requestInit.body = init.form;
    } else if (init?.body !== undefined) {
      requestInit.body = JSON.stringify(init.body);
    }
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, requestInit);

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      // Session absente/expirée sur une route protégée : on notifie pour purger l'état
      // local. On ignore les 401 de la connexion/inscription (mauvais identifiants).
      if (response.status === 401 && !this.isAuthEntryPoint(path)) {
        this.onUnauthorized?.();
      }
      throw new ApiError(response.status, `Requête ${path} échouée`, payload);
    }
    return schema.parse(payload);
  }

  private isAuthEntryPoint(path: string): boolean {
    return path.startsWith("/auth/login") || path.startsWith("/auth/register");
  }
}
