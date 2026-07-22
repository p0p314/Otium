import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import {
  type EpisodeCandidate,
  type MovieCandidate,
  NOTIFIABLE_STATUSES,
  type NotificationCandidateRepository,
} from "../domain";

/**
 * Adapter Prisma des candidats à notification (ADR-0020).
 *
 * Les deux requêtes sont **fortement bornées** : côté séries, aux épisodes dont `airDate`
 * tombe dans la fenêtre récente (index sur `airDate`) ; côté films, à la fenêtre de
 * sortie. Dans les deux cas, restreintes aux éléments de bibliothèque « à voir »/« en
 * cours ». On ne balaie jamais toute la bibliothèque de tous les utilisateurs.
 */
@Injectable()
export class PrismaNotificationCandidateRepository implements NotificationCandidateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRecentlyAiredEpisodes(since: Date, until: Date): Promise<EpisodeCandidate[]> {
    const episodes = await this.prisma.episode.findMany({
      where: {
        airDate: { gt: since, lte: until },
        season: {
          media: {
            type: "SERIES",
            // Au moins un utilisateur suit la série (« à voir »/« en cours »).
            libraryItems: { some: { status: { in: [...NOTIFIABLE_STATUSES] } } },
          },
        },
      },
      select: {
        id: true,
        number: true,
        title: true,
        airDate: true,
        season: {
          select: {
            number: true,
            media: {
              select: {
                id: true,
                title: true,
                posterUrl: true,
                externalProvider: true,
                externalId: true,
                libraryItems: {
                  where: { status: { in: [...NOTIFIABLE_STATUSES] } },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    const candidates: EpisodeCandidate[] = [];
    for (const episode of episodes) {
      const media = episode.season.media;
      for (const item of media.libraryItems) {
        candidates.push({
          userId: item.userId,
          mediaId: media.id,
          provider: media.externalProvider,
          externalId: media.externalId,
          seriesTitle: media.title,
          posterUrl: media.posterUrl,
          episodeId: episode.id,
          seasonNumber: episode.season.number,
          episodeNumber: episode.number,
          episodeTitle: episode.title,
          airDate: episode.airDate as Date,
        });
      }
    }
    return candidates;
  }

  async findMoviesInReleaseWindow(
    releasedSince: Date,
    upcomingUntil: Date,
  ): Promise<MovieCandidate[]> {
    const items = await this.prisma.libraryItem.findMany({
      where: {
        status: { in: [...NOTIFIABLE_STATUSES] },
        media: {
          type: "MOVIE",
          releaseDate: { gte: releasedSince, lte: upcomingUntil },
        },
      },
      select: {
        userId: true,
        media: {
          select: {
            id: true,
            title: true,
            posterUrl: true,
            externalProvider: true,
            externalId: true,
            releaseDate: true,
          },
        },
      },
    });

    return items.map((item) => ({
      userId: item.userId,
      mediaId: item.media.id,
      provider: item.media.externalProvider,
      externalId: item.media.externalId,
      title: item.media.title,
      posterUrl: item.media.posterUrl,
      releaseDate: item.media.releaseDate as Date,
    }));
  }
}
