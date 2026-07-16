import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type {
  PersistableSeason,
  SeasonRef,
  SeriesProgressRecord,
  SeriesTrackingRepository,
  TrackingContext,
  WatchStatus,
} from "../domain";

/** Adapter Prisma du port `SeriesTrackingRepository` (saisons/épisodes + épisodes vus). */
@Injectable()
export class PrismaSeriesTrackingRepository implements SeriesTrackingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getContext(userId: string, itemId: string): Promise<TrackingContext | null> {
    const item = await this.prisma.libraryItem.findFirst({
      where: { id: itemId, userId },
      include: { media: true },
    });
    if (!item) return null;
    return {
      mediaId: item.mediaId,
      externalId: item.media.externalId,
      title: item.media.title,
      status: item.status,
    };
  }

  async hasEpisodes(mediaId: string): Promise<boolean> {
    return (await this.prisma.episode.count({ where: { season: { mediaId } } })) > 0;
  }

  async saveSeasons(mediaId: string, seasons: readonly PersistableSeason[]): Promise<void> {
    for (const season of seasons) {
      const seasonRow = await this.prisma.season.upsert({
        where: { mediaId_number: { mediaId, number: season.number } },
        create: { mediaId, number: season.number },
        update: {},
      });
      for (const episode of season.episodes) {
        await this.prisma.episode.upsert({
          where: { seasonId_number: { seasonId: seasonRow.id, number: episode.number } },
          create: {
            seasonId: seasonRow.id,
            number: episode.number,
            title: episode.title,
            runtimeMinutes: episode.runtimeMinutes,
            airDate: episode.airDate,
          },
          update: {
            title: episode.title,
            runtimeMinutes: episode.runtimeMinutes,
            airDate: episode.airDate,
          },
        });
      }
    }
  }

  async getSeasons(mediaId: string): Promise<SeasonRef[]> {
    const seasons = await this.prisma.season.findMany({
      where: { mediaId },
      include: { episodes: { orderBy: { number: "asc" } } },
      orderBy: { number: "asc" },
    });
    return seasons.map((s) => ({
      number: s.number,
      episodes: s.episodes.map((e) => ({
        id: e.id,
        seasonNumber: s.number,
        number: e.number,
        title: e.title,
        airDate: e.airDate,
      })),
    }));
  }

  async getWatchedEpisodeIds(itemId: string): Promise<Set<string>> {
    const rows = await this.prisma.watchedEpisode.findMany({
      where: { libraryItemId: itemId },
      select: { episodeId: true },
    });
    return new Set(rows.map((r) => r.episodeId));
  }

  async isEpisodeOfMedia(mediaId: string, episodeId: string): Promise<boolean> {
    return (await this.prisma.episode.count({ where: { id: episodeId, season: { mediaId } } })) > 0;
  }

  async countEpisodesOfMedia(mediaId: string, episodeIds: readonly string[]): Promise<number> {
    if (episodeIds.length === 0) return 0;
    return this.prisma.episode.count({
      where: { id: { in: [...episodeIds] }, season: { mediaId } },
    });
  }

  async setEpisodeWatched(itemId: string, episodeId: string, watched: boolean): Promise<void> {
    if (watched) {
      await this.prisma.watchedEpisode.upsert({
        where: { libraryItemId_episodeId: { libraryItemId: itemId, episodeId } },
        create: { libraryItemId: itemId, episodeId },
        update: {},
      });
    } else {
      await this.prisma.watchedEpisode.deleteMany({
        where: { libraryItemId: itemId, episodeId },
      });
    }
  }

  async setEpisodesWatched(
    itemId: string,
    episodeIds: readonly string[],
    watched: boolean,
  ): Promise<void> {
    if (episodeIds.length === 0) return;
    if (watched) {
      await this.prisma.watchedEpisode.createMany({
        data: episodeIds.map((episodeId) => ({ libraryItemId: itemId, episodeId })),
        skipDuplicates: true,
      });
    } else {
      await this.prisma.watchedEpisode.deleteMany({
        where: { libraryItemId: itemId, episodeId: { in: [...episodeIds] } },
      });
    }
  }

  async setStatus(itemId: string, status: WatchStatus): Promise<void> {
    await this.prisma.libraryItem.update({ where: { id: itemId }, data: { status } });
  }

  async listTrackedSeries(userId: string): Promise<SeriesProgressRecord[]> {
    const items = await this.prisma.libraryItem.findMany({
      where: { userId, media: { type: "SERIES" } },
      include: {
        media: {
          include: {
            seasons: {
              orderBy: { number: "asc" },
              include: { episodes: { orderBy: { number: "asc" } } },
            },
          },
        },
        watched: { select: { episodeId: true, watchedAt: true } },
      },
    });

    return items.map((item) => {
      const watchedIds = new Set(item.watched.map((w) => w.episodeId));
      const lastWatchedAt = item.watched.reduce<Date | null>(
        (latest, w) => (latest === null || w.watchedAt > latest ? w.watchedAt : latest),
        null,
      );
      return {
        itemId: item.id,
        title: item.media.title,
        posterUrl: item.media.posterUrl,
        status: item.status,
        seasons: item.media.seasons.map((s) => ({
          number: s.number,
          episodes: s.episodes.map((e) => ({
            id: e.id,
            seasonNumber: s.number,
            number: e.number,
            title: e.title,
            airDate: e.airDate,
          })),
        })),
        watchedIds,
        lastWatchedAt,
      };
    });
  }
}
