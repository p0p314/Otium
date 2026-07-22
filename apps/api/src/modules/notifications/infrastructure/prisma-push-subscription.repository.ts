import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type {
  PushSubscriptionData,
  PushSubscriptionRecord,
  PushSubscriptionRepository,
} from "../domain";

/** Colonnes nécessaires à l'envoi — jamais l'objet complet (éco-conception). */
const SELECT = {
  id: true,
  userId: true,
  endpoint: true,
  p256dh: true,
  auth: true,
} as const;

/** Adapter Prisma du port `PushSubscriptionRepository` (ADR-0020). */
@Injectable()
export class PrismaPushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, data: PushSubscriptionData): Promise<void> {
    // Upsert par endpoint : ré-enregistrer le même appareil met à jour ses clés et le
    // rattache à l'utilisateur courant (cas d'un appareil partagé qui change de compte).
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
      },
      update: {
        userId,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
      },
    });
  }

  async removeForUser(userId: string, endpoint: string): Promise<void> {
    // Scopé à l'utilisateur : on ne supprime jamais l'abonnement d'autrui.
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async removeByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async findByUserIds(userIds: readonly string[]): Promise<PushSubscriptionRecord[]> {
    if (userIds.length === 0) return [];
    return this.prisma.pushSubscription.findMany({
      where: { userId: { in: [...userIds] } },
      select: SELECT,
    });
  }

  async findByUser(userId: string): Promise<PushSubscriptionRecord[]> {
    return this.prisma.pushSubscription.findMany({ where: { userId }, select: SELECT });
  }
}
