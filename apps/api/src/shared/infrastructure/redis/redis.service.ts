import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import type { Env } from "../config/env";

/**
 * Client Redis partagé : cache API, sessions, rate-limiting, files de jobs (futur).
 * Exposé via un service technique en infrastructure.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService<Env, true>) {
    this.client = new Redis(config.get("REDIS_URL", { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.client.on("error", (err) => this.logger.error(`Redis: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
