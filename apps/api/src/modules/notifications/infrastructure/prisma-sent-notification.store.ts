import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type { NotificationClaim, SentNotificationStore } from "../domain";

/**
 * Adapter Prisma du registre anti-doublon (ADR-0020).
 *
 * `claim` insère le lot en **une seule instruction** `INSERT … ON CONFLICT DO NOTHING
 * RETURNING`. `RETURNING` ne rend que les lignes **réellement insérées** : c'est ce qui
 * distingue une notification neuve d'un doublon, de façon atomique. Deux exécutions
 * concurrentes ne peuvent donc pas réclamer la même clé — une seule recevra la ligne, et
 * enverra la notification.
 */
@Injectable()
export class PrismaSentNotificationStore implements SentNotificationStore {
  constructor(private readonly prisma: PrismaService) {}

  async claim(claims: readonly NotificationClaim[]): Promise<NotificationClaim[]> {
    if (claims.length === 0) return [];

    const now = new Date();
    const values = claims.map(
      (c) => Prisma.sql`(${c.userId}, ${c.dedupKey}, ${c.type}, ${now})`,
    );
    const inserted = await this.prisma.$queryRaw<{ userId: string; dedupKey: string }[]>(
      Prisma.sql`
        INSERT INTO "SentNotification" ("id", "userId", "dedupKey", "type", "createdAt")
        SELECT gen_random_uuid()::text, v."userId", v."dedupKey", v."type", v."createdAt"
        FROM (VALUES ${Prisma.join(values)})
          AS v("userId", "dedupKey", "type", "createdAt")
        ON CONFLICT ("userId", "dedupKey") DO NOTHING
        RETURNING "userId", "dedupKey"
      `,
    );

    const byKey = new Map(claims.map((c) => [`${c.userId}::${c.dedupKey}`, c]));
    return inserted
      .map((row) => byKey.get(`${row.userId}::${row.dedupKey}`))
      .filter((c): c is NotificationClaim => c !== undefined);
  }
}
