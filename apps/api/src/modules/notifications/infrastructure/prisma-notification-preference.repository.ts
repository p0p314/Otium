import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type {
  NotificationPreferenceRepository,
  NotificationPreferenceUpdate,
  UserPreferences,
} from "../domain";

const SELECT = {
  userId: true,
  newEpisodes: true,
  newSeasons: true,
  movieReminder: true,
  movieRelease: true,
} as const;

type Row = { [K in keyof typeof SELECT]: K extends "userId" ? string : boolean };

function toPreferences(row: Row): UserPreferences {
  return {
    newEpisodes: row.newEpisodes,
    newSeasons: row.newSeasons,
    movieReminder: row.movieReminder,
    movieRelease: row.movieRelease,
  };
}

/** Adapter Prisma du port `NotificationPreferenceRepository` (ADR-0020). */
@Injectable()
export class PrismaNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<UserPreferences | null> {
    const row = await this.prisma.notificationPreference.findUnique({
      where: { userId },
      select: SELECT,
    });
    return row ? toPreferences(row) : null;
  }

  async getForUsers(userIds: readonly string[]): Promise<Map<string, UserPreferences>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: [...userIds] } },
      select: SELECT,
    });
    return new Map(rows.map((row) => [row.userId, toPreferences(row)]));
  }

  async upsert(
    userId: string,
    update: NotificationPreferenceUpdate,
  ): Promise<UserPreferences> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      // À la création, les champs non fournis prennent leur défaut de schéma (`true`).
      create: { userId, ...update },
      update,
      select: SELECT,
    });
    return toPreferences(row);
  }
}
