import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import type {
  CustomList,
  CustomListDetail,
  ListRepository,
  MediaDescriptor,
} from "../domain";

type ListDetailRow = Prisma.ListGetPayload<{
  include: { items: { include: { media: true } } };
}>;

/** Adapter Prisma du port `ListRepository`. L'ajout upsert le média puis le lie à la liste. */
@Injectable()
export class PrismaListRepository implements ListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string): Promise<CustomList> {
    const list = await this.prisma.list.create({ data: { userId, name } });
    return { id: list.id, name: list.name, itemCount: 0, createdAt: list.createdAt };
  }

  async findByUser(userId: string): Promise<CustomList[]> {
    const lists = await this.prisma.list.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    });
    return lists.map((l) => ({
      id: l.id,
      name: l.name,
      itemCount: l._count.items,
      createdAt: l.createdAt,
    }));
  }

  async findDetail(userId: string, listId: string): Promise<CustomListDetail | null> {
    const list = await this.prisma.list.findFirst({
      where: { id: listId, userId },
      include: { items: { orderBy: { position: "asc" }, include: { media: true } } },
    });
    return list ? this.toDetail(list) : null;
  }

  async rename(userId: string, listId: string, name: string): Promise<CustomList | null> {
    const result = await this.prisma.list.updateMany({ where: { id: listId, userId }, data: { name } });
    if (result.count === 0) return null;
    const list = await this.prisma.list.findFirst({
      where: { id: listId, userId },
      include: { _count: { select: { items: true } } },
    });
    return list
      ? { id: list.id, name: list.name, itemCount: list._count.items, createdAt: list.createdAt }
      : null;
  }

  async remove(userId: string, listId: string): Promise<boolean> {
    const result = await this.prisma.list.deleteMany({ where: { id: listId, userId } });
    return result.count > 0;
  }

  async addMedia(
    userId: string,
    listId: string,
    media: MediaDescriptor,
  ): Promise<CustomListDetail | null> {
    const list = await this.prisma.list.findFirst({ where: { id: listId, userId } });
    if (!list) return null;

    const mediaRow = await this.upsertMedia(media);
    const last = await this.prisma.listItem.findFirst({
      where: { listId },
      orderBy: { position: "desc" },
    });
    const position = last ? last.position + 1 : 0;
    await this.prisma.listItem.upsert({
      where: { listId_mediaId: { listId, mediaId: mediaRow.id } },
      create: { listId, mediaId: mediaRow.id, position },
      update: {},
    });
    return this.findDetail(userId, listId);
  }

  async removeMedia(
    userId: string,
    listId: string,
    externalRef: { provider: string; externalId: string },
  ): Promise<CustomListDetail | null> {
    const list = await this.prisma.list.findFirst({ where: { id: listId, userId } });
    if (!list) return null;

    const mediaRow = await this.prisma.media.findUnique({
      where: {
        externalProvider_externalId: {
          externalProvider: externalRef.provider,
          externalId: externalRef.externalId,
        },
      },
      select: { id: true },
    });
    if (mediaRow) {
      await this.prisma.listItem.deleteMany({ where: { listId, mediaId: mediaRow.id } });
    }
    return this.findDetail(userId, listId);
  }

  private upsertMedia(media: MediaDescriptor) {
    return this.prisma.media.upsert({
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
        genres: [],
      },
      update: { title: media.title, year: media.year, posterUrl: media.posterUrl },
    });
  }

  private toDetail(list: ListDetailRow): CustomListDetail {
    return {
      id: list.id,
      name: list.name,
      createdAt: list.createdAt,
      items: list.items.map((item) => ({
        position: item.position,
        media: {
          externalRef: { provider: item.media.externalProvider, externalId: item.media.externalId },
          type: item.media.type,
          title: item.media.title,
          year: item.media.year,
          posterUrl: item.media.posterUrl,
        },
      })),
    };
  }
}
