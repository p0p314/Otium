import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type { AccountExport, AccountGateway } from "../domain/account-gateway";

/** Adapter Prisma du port `AccountGateway` (export + effacement RGPD). */
@Injectable()
export class PrismaAccountGateway implements AccountGateway {
  constructor(private readonly prisma: PrismaService) {}

  async export(userId: string): Promise<AccountExport> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Utilisateur introuvable.");

    const [library, lists, reviews, episodeReviews] = await Promise.all([
      this.prisma.libraryItem.findMany({
        where: { userId },
        include: { media: true, progress: { orderBy: { occurredAt: "asc" } } },
        orderBy: { addedAt: "asc" },
      }),
      this.prisma.list.findMany({
        where: { userId },
        include: { items: { include: { media: true }, orderBy: { position: "asc" } } },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.review.findMany({
        where: { userId },
        include: { media: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.episodeReview.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
      },
      library: library.map((item) => ({
        media: {
          title: item.media.title,
          type: item.media.type,
          provider: item.media.externalProvider,
          externalId: item.media.externalId,
        },
        status: item.status,
        rating: item.rating,
        isFavorite: item.isFavorite,
        addedAt: item.addedAt.toISOString(),
        startedAt: item.startedAt?.toISOString() ?? null,
        finishedAt: item.finishedAt?.toISOString() ?? null,
        progress: item.progress.map((entry) => ({
          unit: entry.unit,
          fromValue: entry.fromValue,
          toValue: entry.toValue,
          occurredAt: entry.occurredAt.toISOString(),
        })),
      })),
      lists: lists.map((list) => ({
        name: list.name,
        createdAt: list.createdAt.toISOString(),
        items: list.items.map((item) => ({ title: item.media.title, position: item.position })),
      })),
      reviews: reviews.map((review) => ({
        mediaTitle: review.media.title,
        body: review.body,
        rating: review.rating,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      })),
      episodeReviews: episodeReviews.map((review) => ({
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      })),
    };
  }

  async delete(userId: string): Promise<void> {
    // Le journal d'événements n'a pas de cascade FK : on le purge explicitement. La
    // suppression de l'utilisateur cascade sur le reste (bibliothèque, listes, avis,
    // sessions…). Transaction : tout ou rien.
    await this.prisma.$transaction([
      this.prisma.domainEvent.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
