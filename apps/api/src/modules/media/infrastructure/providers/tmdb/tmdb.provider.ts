import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../../../shared/infrastructure/config/env";
import { HttpClient } from "../../../../../shared/infrastructure/http/http-client";
import { RedisService } from "../../../../../shared/infrastructure/redis/redis.service";
import type {
  CatalogSearchResult,
  CatalogSeriesDetails,
  MediaCatalogProvider,
  MediaCatalogSearchParams,
} from "../../../domain";
import { toCatalogMedia, toCatalogSeason } from "./tmdb.mapper";
import type { TmdbSearchResponse, TmdbSeasonDetails, TmdbTvDetails } from "./tmdb.types";

/**
 * Adapter TMDB du port `MediaCatalogProvider`. Normalise les réponses TMDB vers le
 * modèle catalogue et met en cache (Redis) pour limiter les appels réseau (éco-conception).
 * La panne du cache n'empêche pas les requêtes (dégradation gracieuse — risque R1).
 */
@Injectable()
export class TmdbProvider implements MediaCatalogProvider {
  readonly name = "tmdb";
  private readonly logger = new Logger(TmdbProvider.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly http: HttpClient,
    private readonly redis: RedisService,
  ) {}

  async search(params: MediaCatalogSearchParams): Promise<CatalogSearchResult> {
    const cacheKey = `tmdb:search:${params.type ?? "all"}:${params.page}:${params.query.trim().toLowerCase()}`;
    const cached = await this.cacheGet<CatalogSearchResult>(cacheKey);
    if (cached) return cached;

    const imageBaseUrl = this.config.get("TMDB_IMAGE_BASE_URL", { infer: true });
    const raw = await this.authedGet<TmdbSearchResponse>(
      `/search/multi?include_adult=false&language=fr-FR&page=${params.page}&query=${encodeURIComponent(params.query)}`,
    );

    let items = raw.results
      .map((item) => toCatalogMedia(item, imageBaseUrl))
      .filter((m): m is NonNullable<typeof m> => m !== null);
    if (params.type) {
      items = items.filter((m) => m.type === params.type);
    }

    const result: CatalogSearchResult = {
      items,
      page: raw.page,
      pageSize: params.pageSize,
      total: raw.total_results,
    };
    await this.cacheSet(cacheKey, result);
    return result;
  }

  async getSeriesDetails(externalId: string): Promise<CatalogSeriesDetails> {
    const cacheKey = `tmdb:series:${externalId}`;
    const cached = await this.cacheGet<CatalogSeriesDetails>(cacheKey);
    if (cached) return cached;

    const tv = await this.authedGet<TmdbTvDetails>(`/tv/${externalId}?language=fr-FR`);
    const seasonNumbers = tv.seasons
      .filter((s) => s.season_number >= 1 && s.episode_count > 0)
      .map((s) => s.season_number);

    const seasons = await Promise.all(
      seasonNumbers.map(async (number) => {
        const season = await this.authedGet<TmdbSeasonDetails>(
          `/tv/${externalId}/season/${number}?language=fr-FR`,
        );
        return toCatalogSeason(number, season);
      }),
    );

    const result: CatalogSeriesDetails = { seasons };
    await this.cacheSet(cacheKey, result);
    return result;
  }

  /** Effectue un GET TMDB authentifié (jeton v4 Bearer ou clé v3 `api_key`). */
  private authedGet<T>(path: string): Promise<T> {
    const token = this.config.get("TMDB_ACCESS_TOKEN", { infer: true });
    if (!token) {
      throw new ServiceUnavailableException(
        "Service TMDB indisponible : TMDB_ACCESS_TOKEN n'est pas configuré.",
      );
    }
    const baseUrl = this.config.get("TMDB_API_BASE_URL", { infer: true });
    let url = `${baseUrl}${path}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      url += `${url.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(token)}`;
    }
    return this.http.getJson<T>(url, headers);
  }

  private async cacheGet<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.warn(`Cache indisponible (lecture): ${(error as Error).message}`);
      return null;
    }
  }

  private async cacheSet<T>(key: string, value: T): Promise<void> {
    try {
      const ttl = this.config.get("TMDB_CACHE_TTL_SECONDS", { infer: true });
      await this.redis.client.set(key, JSON.stringify(value), "EX", ttl);
    } catch (error) {
      this.logger.warn(`Cache indisponible (écriture): ${(error as Error).message}`);
    }
  }
}
