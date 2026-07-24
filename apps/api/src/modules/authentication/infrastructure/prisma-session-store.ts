import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type { Session, SessionStore } from "../domain/ports/session-store";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours

/**
 * Adapter Postgres du port `SessionStore` : jetons opaques → id utilisateur, avec
 * expiration. Remplace Redis pour l'hébergement gratuit à service unique (ADR-0012).
 */
@Injectable()
export class PrismaSessionStore implements SessionStore {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<Session> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await this.prisma.session.create({ data: { token, userId, expiresAt } });
    return { token, userId, expiresAt };
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
