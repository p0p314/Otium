import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../shared/infrastructure/redis/redis.service";
import type { Session, SessionStore } from "../domain/ports/session-store";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours
const KEY_PREFIX = "session:";

/** Adapter Redis du port `SessionStore` : jetons opaques → id utilisateur, avec TTL. */
@Injectable()
export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: RedisService) {}

  async create(userId: string): Promise<Session> {
    const token = randomBytes(32).toString("hex");
    await this.redis.client.set(KEY_PREFIX + token, userId, "EX", SESSION_TTL_SECONDS);
    return {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    };
  }

  async resolve(token: string): Promise<string | null> {
    if (!token) return null;
    return this.redis.client.get(KEY_PREFIX + token);
  }

  async revoke(token: string): Promise<void> {
    await this.redis.client.del(KEY_PREFIX + token);
  }
}
