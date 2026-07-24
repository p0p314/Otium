import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type { Session, SessionStore } from "../domain/ports/session-store";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours

/** Intervalle minimal entre deux purges des sessions expirées (garde-fou de charge). */
const PURGE_INTERVAL_MS = 60 * 60 * 1000; // 1 h

/**
 * Adapter Postgres du port `SessionStore` : jetons opaques → id utilisateur, avec
 * expiration. Remplace Redis pour l'hébergement gratuit à service unique (ADR-0012).
 */
@Injectable()
export class PrismaSessionStore implements SessionStore {
  /** Dernière purge globale (throttling ; 0 = jamais). */
  private lastPurgeAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<Session> {
    // Purge opportuniste des sessions expirées (au plus une fois par heure) : sans Redis ni
    // cron, la table Session grossirait sinon indéfiniment (VULN-13). Index sur `expiresAt`.
    await this.purgeExpired();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await this.prisma.session.create({ data: { token, userId, expiresAt } });
    return { token, userId, expiresAt };
  }

  /** Supprime les sessions expirées, au plus une fois par `PURGE_INTERVAL_MS`. Best-effort. */
  async purgeExpired(): Promise<void> {
    const now = Date.now();
    if (now - this.lastPurgeAt < PURGE_INTERVAL_MS) return;
    this.lastPurgeAt = now;
    try {
      await this.prisma.session.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
    } catch {
      // Une purge ratée ne doit jamais faire échouer une connexion : on réessaiera plus tard.
    }
  }

  async resolve(token: string): Promise<string | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({ where: { token } });
    if (!session) return null;
    // Expiré : on purge et on renvoie null (l'expiration TTL de Redis, faite à la main).
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.deleteMany({ where: { token } });
      return null;
    }
    return session.userId;
  }

  async revoke(token: string): Promise<void> {
    // deleteMany : idempotent, ne lève pas si le jeton n'existe plus.
    await this.prisma.session.deleteMany({ where: { token } });
  }

  async revokeAllForUser(userId: string, exceptToken?: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId, ...(exceptToken ? { token: { not: exceptToken } } : {}) },
    });
  }
}
