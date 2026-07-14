import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type { Review, ReviewRepository } from "../domain";

/** Adapter Prisma du port `ReviewRepository` (un avis par utilisateur et par média). */
@Injectable()
export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, mediaId: string): Promise<Review | null> {
    const row = await this.prisma.review.findUnique({
      where: { userId_mediaId: { userId, mediaId } },
    });
    return row ? { body: row.body, updatedAt: row.updatedAt } : null;
  }

  async save(userId: string, mediaId: string, body: string): Promise<Review> {
    const row = await this.prisma.review.upsert({
      where: { userId_mediaId: { userId, mediaId } },
      create: { userId, mediaId, body },
      update: { body },
    });
    return { body: row.body, updatedAt: row.updatedAt };
  }

  async delete(userId: string, mediaId: string): Promise<void> {
    await this.prisma.review.deleteMany({ where: { userId, mediaId } });
  }
}
