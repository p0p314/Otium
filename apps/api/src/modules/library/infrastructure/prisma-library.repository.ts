import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { type Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type { LibraryItem, LibraryRepository, MediaDescriptor, WatchStatus } from "../domain";

type LibraryItemRow = Prisma.LibraryItemGetPayload<{ include: { media: true } }>;

/** Adapter Prisma du port `LibraryRepository`. L'ajout upsert le média puis l'élément. */
@Injectable()
export class PrismaLibraryRepository implements LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, media: MediaDescriptor): Promise<LibraryItem> {
    const mediaRow = await this.prisma.media.upsert({
      where: {
        externalProvider_externalId: {
          externalProvider: media.externalRef.provider,
          externalId: media.externalRef.externalId,
        },
      },
      create: {
        type: media.type,
        title: media.title,
        year: media.year,
        posterUrl: media.posterUrl,
        externalProvider: media.externalRef.provider,
        externalId: media.externalRef.externalId,
        genres: media.genres ? [...media.genres] : [],
        runtimeMinutes: media.runtimeMinutes ?? null,
      },
      update: {
        title: media.title,
        year: media.year,
        posterUrl: media.posterUrl,
        // Enrichit un média déjà présent mais sans genres/durée (ajout antérieur).
        ...(media.genres && media.genres.length > 0 ? { genres: [...media.genres] } : {}),
        ...(media.runtimeMinutes != null ? { runtimeMinutes: media.runtimeMinutes } : {}),
      },
    });

    const item = await this.prisma.libraryItem.upsert({
      where: { userId_mediaId: { userId, mediaId: mediaRow.id } },
      create: { userId, mediaId: mediaRow.id },
      update: {},
      include: { media: true },
    });
    return this.toDomain(item);
  }

  async findByUser(userId: string): Promise<LibraryItem[]> {
    const rows = await this.prisma.libraryItem.findMany({
      where: { userId },
      include: { media: true },
      orderBy: { addedAt: "desc" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findItem(userId: string, itemId: string): Promise<LibraryItem | null> {
    const row = await this.prisma.libraryItem.findFirst({
      where: { id: itemId, userId },
      include: { media: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async remove(userId: string, itemId: string): Promise<void> {
    await this.prisma.libraryItem.deleteMany({ where: { id: itemId, userId } });
  }

  async setFavorite(userId: string, itemId: string, isFavorite: boolean): Promise<LibraryItem> {
    await this.prisma.libraryItem.updateMany({ where: { id: itemId, userId }, data: { isFavorite } });
    const updated = await this.findItem(userId, itemId);
    if (!updated) throw new InternalServerErrorException("Élément introuvable après mise à jour.");
    return updated;
  }

  async setStatus(userId: string, itemId: string, status: WatchStatus): Promise<LibraryItem> {
    await this.prisma.libraryItem.updateMany({ where: { id: itemId, userId }, data: { status } });
    const updated = await this.findItem(userId, itemId);
    if (!updated) throw new InternalServerErrorException("Élément introuvable après mise à jour.");
    return updated;
  }

  async setRating(userId: string, itemId: string, rating: number | null): Promise<LibraryItem> {
    await this.prisma.libraryItem.updateMany({ where: { id: itemId, userId }, data: { rating } });
    const updated = await this.findItem(userId, itemId);
    if (!updated) throw new InternalServerErrorException("Élément introuvable après mise à jour.");
    return updated;
  }

  async getMediaId(userId: string, itemId: string): Promise<string | null> {
    const item = await this.prisma.libraryItem.findFirst({
      where: { id: itemId, userId },
      select: { mediaId: true },
    });
    return item?.mediaId ?? null;
  }

  async backfillMediaMetadata(
    ref: { provider: string; externalId: string },
    metadata: { genres: readonly string[]; runtimeMinutes: number | null },
  ): Promise<void> {
    await this.prisma.media.updateMany({
      where: { externalProvider: ref.provider, externalId: ref.externalId },
      data: {
        ...(metadata.runtimeMinutes != null ? { runtimeMinutes: metadata.runtimeMinutes } : {}),
        ...(metadata.genres.length > 0 ? { genres: [...metadata.genres] } : {}),
      },
    });
  }

  private toDomain(row: LibraryItemRow): LibraryItem {
    return {
      id: row.id,
      media: {
        externalRef: { provider: row.media.externalProvider, externalId: row.media.externalId },
        type: row.media.type,
        title: row.media.title,
        year: row.media.year,
        posterUrl: row.media.posterUrl,
        genres: row.media.genres,
        runtimeMinutes: row.media.runtimeMinutes,
      },
      status: row.status,
      rating: row.rating,
      isFavorite: row.isFavorite,
      addedAt: row.addedAt,
    };
  }
}
