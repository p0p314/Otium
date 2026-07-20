import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { type Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type {
  BookMetadata,
  LibraryItem,
  LibraryRepository,
  MediaDescriptor,
  ProgressUpdate,
  UpcomingMovieRecord,
  WatchStatus,
} from "../domain";

type LibraryItemRow = Prisma.LibraryItemGetPayload<{
  include: { media: { include: { book: true } } };
}>;

/** Les métadonnées de livre voyagent toujours avec le média. */
const WITH_MEDIA = { media: { include: { book: true } } } as const;

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
        releaseDate: media.releaseDate ?? null,
      },
      update: {
        title: media.title,
        year: media.year,
        posterUrl: media.posterUrl,
        // Enrichit un média déjà présent mais sans genres/durée (ajout antérieur).
        ...(media.genres && media.genres.length > 0 ? { genres: [...media.genres] } : {}),
        ...(media.runtimeMinutes != null ? { runtimeMinutes: media.runtimeMinutes } : {}),
        ...(media.releaseDate != null ? { releaseDate: media.releaseDate } : {}),
      },
    });

    if (media.book) await this.upsertBookMetadata(mediaRow.id, media.book);

    const item = await this.prisma.libraryItem.upsert({
      where: { userId_mediaId: { userId, mediaId: mediaRow.id } },
      create: { userId, mediaId: mediaRow.id },
      update: {},
      include: WITH_MEDIA,
    });
    return this.toDomain(item);
  }

  /**
   * Persiste les métadonnées de livre du média (données objectives, partagées entre
   * utilisateurs). Seules les valeurs renseignées écrasent l'existant : une fiche déjà
   * complète n'est pas appauvrie par un ajout ultérieur aux données plus pauvres.
   */
  private async upsertBookMetadata(mediaId: string, book: BookMetadata): Promise<void> {
    const fields = {
      subtitle: book.subtitle,
      authors: [...book.authors],
      description: book.description,
      pageCount: book.pageCount,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      language: book.language,
      categories: [...book.categories],
      isbn10: book.isbn10,
      isbn13: book.isbn13,
      googleBooksId: book.googleBooksId,
      openLibraryId: book.openLibraryId,
      infoUrl: book.infoUrl,
      previewUrl: book.previewUrl,
      averageRating: book.averageRating,
      ratingsCount: book.ratingsCount,
      coverUrlLarge: book.coverUrlLarge,
      sources: [...book.sources],
    };
    const filled = Object.fromEntries(
      Object.entries(fields).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : value !== null,
      ),
    );
    await this.prisma.bookMetadata.upsert({
      where: { mediaId },
      create: { mediaId, ...fields },
      update: filled,
    });
  }

  async findByUser(userId: string): Promise<LibraryItem[]> {
    const rows = await this.prisma.libraryItem.findMany({
      where: { userId },
      include: {
        ...WITH_MEDIA,
        // Dernier épisode vu (borné à 1) : sert de date de visionnage sans charger tout l'historique.
        watched: { orderBy: { watchedAt: "desc" }, take: 1, select: { watchedAt: true } },
      },
    });
    // Date de visionnage : dernier épisode vu (série) ou dernière MAJ de l'élément (film).
    return rows
      .map((row) => this.toDomain(row, row.watched[0]?.watchedAt ?? row.updatedAt))
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  async findItem(userId: string, itemId: string): Promise<LibraryItem | null> {
    const row = await this.prisma.libraryItem.findFirst({
      where: { id: itemId, userId },
      include: WITH_MEDIA,
    });
    return row ? this.toDomain(row) : null;
  }

  async remove(userId: string, itemId: string): Promise<void> {
    await this.prisma.libraryItem.deleteMany({ where: { id: itemId, userId } });
  }

  async setFavorite(userId: string, itemId: string, isFavorite: boolean): Promise<LibraryItem> {
    await this.prisma.libraryItem.updateMany({
      where: { id: itemId, userId },
      data: { isFavorite },
    });
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

  async listUpcomingMovies(userId: string, now: Date): Promise<UpcomingMovieRecord[]> {
    const rows = await this.prisma.libraryItem.findMany({
      where: {
        userId,
        status: { not: "DROPPED" },
        media: { type: "MOVIE", releaseDate: { gt: now } },
      },
      select: { id: true, media: { select: { title: true, posterUrl: true, releaseDate: true } } },
      orderBy: { media: { releaseDate: "asc" } },
    });
    return rows.map((row) => ({
      itemId: row.id,
      title: row.media.title,
      posterUrl: row.media.posterUrl,
      releaseDate: row.media.releaseDate as Date,
    }));
  }

  async saveProgress(
    userId: string,
    itemId: string,
    update: ProgressUpdate,
  ): Promise<LibraryItem> {
    // Transaction : l'état courant et son historique doivent avancer ensemble, sinon les
    // statistiques temporelles divergeraient de la progression affichée.
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.libraryItem.updateMany({
        where: { id: itemId, userId },
        data: {
          progressUnit: update.progress.unit,
          progressValue: update.progress.value,
          progressTotal: update.progress.total,
          status: update.status,
          startedAt: update.startedAt,
          finishedAt: update.finishedAt,
        },
      });
      if (count === 0 || !update.entry) return;
      await tx.progressEntry.create({
        data: {
          libraryItemId: itemId,
          unit: update.progress.unit,
          fromValue: update.entry.from,
          toValue: update.entry.to,
          occurredAt: update.entry.occurredAt,
        },
      });
    });
    const updated = await this.findItem(userId, itemId);
    if (!updated) throw new InternalServerErrorException("Élément introuvable après mise à jour.");
    return updated;
  }

  async setConsumptionDates(
    userId: string,
    itemId: string,
    dates: { startedAt?: Date | null; finishedAt?: Date | null },
  ): Promise<LibraryItem> {
    await this.prisma.libraryItem.updateMany({
      where: { id: itemId, userId },
      data: {
        // Un champ absent reste inchangé ; `null` efface explicitement la date.
        ...(dates.startedAt !== undefined ? { startedAt: dates.startedAt } : {}),
        ...(dates.finishedAt !== undefined ? { finishedAt: dates.finishedAt } : {}),
      },
    });
    const updated = await this.findItem(userId, itemId);
    if (!updated) throw new InternalServerErrorException("Élément introuvable après mise à jour.");
    return updated;
  }

  private toDomain(row: LibraryItemRow, lastActivityAt: Date = row.updatedAt): LibraryItem {
    const book = row.media.book;
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
        book: book
          ? {
              subtitle: book.subtitle,
              authors: book.authors,
              description: book.description,
              pageCount: book.pageCount,
              publisher: book.publisher,
              publishedDate: book.publishedDate,
              language: book.language,
              categories: book.categories,
              isbn10: book.isbn10,
              isbn13: book.isbn13,
              googleBooksId: book.googleBooksId,
              openLibraryId: book.openLibraryId,
              infoUrl: book.infoUrl,
              previewUrl: book.previewUrl,
              averageRating: book.averageRating,
              ratingsCount: book.ratingsCount,
              coverUrlLarge: book.coverUrlLarge,
              sources: book.sources,
            }
          : null,
      },
      status: row.status,
      rating: row.rating,
      isFavorite: row.isFavorite,
      addedAt: row.addedAt,
      lastActivityAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      // La progression n'existe que si une unité a été fixée (média jamais commencé sinon).
      progress: row.progressUnit
        ? { unit: row.progressUnit, value: row.progressValue ?? 0, total: row.progressTotal }
        : null,
    };
  }
}
