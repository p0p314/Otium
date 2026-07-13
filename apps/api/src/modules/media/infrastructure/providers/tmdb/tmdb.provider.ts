import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../../../shared/infrastructure/config/env";
import { HttpClient } from "../../../../../shared/infrastructure/http/http-client";
import { RedisService } from "../../../../../shared/infrastructure/redis/redis.service";
import type {
  CatalogSearchResult,
  MediaCatalogProvider,
  MediaCatalogSearchParams,
} from "../../../domain";
import { toCatalogMedia } from "./tmdb.mapper";
import type { TmdbSearchResponse } from "./tmdb.types";

/**
 * Adapter TMDB du port `MediaCatalogProvider`. Normalise les réponses TMDB vers le
 * modèle catalogue et met en cache (Redis) pour limiter les appels réseau (éco-conception).
 * La panne du cache n'empêche pas la recherche (dégradation gracieuse — risque R1).
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
    const token = this.config.get("TMDB_ACCESS_TOKEN", { infer: true });
    if (!token) {
      throw new ServiceUnavailableException(
        "Recherche indisponible : TMDB_ACCESS_TOKEN n'est pas configuré.",
      );
    }

    const cacheKey = this.cacheKey(params);
    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    const imageBaseUrl = this.config.get("TMDB_IMAGE_BASE_URL", { infer: true });
    const baseUrl = this.config.get("TMDB_API_BASE_URL", { infer: true });
    const url =
      `${baseUrl}/search/multi?include_adult=false&language=fr-FR` +
      `&page=${params.page}&query=${encodeURIComponent(params.query)}`;

    const raw = await this.http.getJson<TmdbSearchResponse>(url, {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    });

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

    await this.writeCache(cacheKey, result);
    return result;
  }

  private cacheKey(params: MediaCatalogSearchParams): string {
    return `tmdb:search:${params.type ?? "all"}:${params.page}:${params.query.trim().toLowerCase()}`;
  }

  private async readCache(key: string): Promise<CatalogSearchResult | null> {
    try {
      const value = await this.redis.client.get(key);
      return value ? (JSON.parse(value) as CatalogSearchResult) : null;
    } catch (error) {
      this.logger.warn(`Cache indisponible (lecture): ${(error as Error).message}`);
      return null;
    }
  }

  private async writeCache(key: string, result: CatalogSearchResult): Promise<void> {
    try {
      const ttl = this.config.get("TMDB_CACHE_TTL_SECONDS", { infer: true });
      await this.redis.client.set(key, JSON.stringify(result), "EX", ttl);
    } catch (error) {
      this.logger.warn(`Cache indisponible (écriture): ${(error as Error).message}`);
    }
  }
}
