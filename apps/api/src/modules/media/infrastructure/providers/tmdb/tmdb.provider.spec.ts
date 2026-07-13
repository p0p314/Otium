import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../../../../shared/infrastructure/config/env";
import type { HttpClient } from "../../../../../shared/infrastructure/http/http-client";
import type { RedisService } from "../../../../../shared/infrastructure/redis/redis.service";
import { TmdbProvider } from "./tmdb.provider";
import type { TmdbSearchResponse } from "./tmdb.types";

const CONFIG: Partial<Env> = {
  TMDB_ACCESS_TOKEN: "token",
  TMDB_API_BASE_URL: "https://api.tmdb/3",
  TMDB_IMAGE_BASE_URL: "https://img/w342",
  TMDB_CACHE_TTL_SECONDS: 3600,
};

function makeConfig(overrides: Partial<Env> = {}): ConfigService<Env, true> {
  const values = { ...CONFIG, ...overrides } as Record<string, unknown>;
  return { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>;
}

function makeRedis(get: () => Promise<string | null> = async () => null): RedisService {
  return { client: { get, set: vi.fn(async () => "OK") } } as unknown as RedisService;
}

const tmdbResponse: TmdbSearchResponse = {
  page: 1,
  total_pages: 1,
  total_results: 2,
  results: [
    { id: 1, media_type: "movie", title: "Dune", release_date: "2021-01-01", poster_path: "/d.jpg" },
    { id: 2, media_type: "tv", name: "Foundation", first_air_date: "2021-01-01" },
    { id: 3, media_type: "person", name: "Someone" },
  ],
};

describe("TmdbProvider", () => {
  it("lève ServiceUnavailable sans jeton configuré", async () => {
    const provider = new TmdbProvider(
      makeConfig({ TMDB_ACCESS_TOKEN: undefined }),
      { getJson: vi.fn() } as unknown as HttpClient,
      makeRedis(),
    );
    await expect(provider.search({ query: "x", page: 1, pageSize: 20 })).rejects.toThrow(
      /TMDB_ACCESS_TOKEN/,
    );
  });

  it("appelle TMDB, normalise et met en cache (cache miss)", async () => {
    const http = { getJson: vi.fn(async () => tmdbResponse) } as unknown as HttpClient;
    const redis = makeRedis();
    const provider = new TmdbProvider(makeConfig(), http, redis);

    const result = await provider.search({ query: "Dune", page: 1, pageSize: 20 });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2); // la "person" est écartée
    expect(result.items[0]?.externalRef).toEqual({ provider: "tmdb", externalId: "1" });
    expect(http.getJson).toHaveBeenCalledOnce();
    expect(redis.client.set).toHaveBeenCalledOnce();
  });

  it("filtre par type et sert le cache sans appel réseau (cache hit)", async () => {
    const cached = JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0 });
    const http = { getJson: vi.fn() } as unknown as HttpClient;
    const provider = new TmdbProvider(makeConfig(), http, makeRedis(async () => cached));

    const result = await provider.search({ query: "Dune", page: 1, pageSize: 20 });

    expect(result.total).toBe(0);
    expect(http.getJson).not.toHaveBeenCalled();
  });

  it("ne retient que le type demandé", async () => {
    const http = { getJson: vi.fn(async () => tmdbResponse) } as unknown as HttpClient;
    const provider = new TmdbProvider(makeConfig(), http, makeRedis());

    const result = await provider.search({ query: "x", page: 1, pageSize: 20, type: "SERIES" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.type).toBe("SERIES");
  });
});
