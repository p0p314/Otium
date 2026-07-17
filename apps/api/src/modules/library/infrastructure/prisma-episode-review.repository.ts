import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type { EpisodeReview, EpisodeReviewRepository } from "../domain";

/** Adapter Prisma du port `EpisodeReviewRepository` (une note/avis par utilisateur et épisode). */
@Injectable()
export class PrismaEpisodeReviewRepository implements EpisodeReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, episodeId: string): Promise<EpisodeReview | null> {
    const row = await this.prisma.episodeReview.findUnique({
      where: { userId_episodeId: { userId, episodeId } },
    });
    return row ? { rating: row.rating, body: row.body, updatedAt: row.updatedAt } : null;
  }

  async save(
    userId: string,
    episodeId: string,
    input: { rating: number | null; body: string | null },
  ): Promise<EpisodeReview> {
    const row = await this.prisma.episodeReview.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      create: { userId, episodeId, rating: input.rating, body: input.body },
      update: { rating: input.rating, body: input.body },
    });
    return { rating: row.rating, body: row.body, updatedAt: row.updatedAt };
  }

  async delete(userId: string, episodeId: string): Promise<void> {
    await this.prisma.episodeReview.deleteMany({ where: { userId, episodeId } });
  }
}
