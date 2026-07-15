import type { ListDetail as ListDetailDto, ListSummary as ListSummaryDto } from "@otium/types";
import type { CustomList, CustomListDetail, MediaDescriptor } from "../domain";

function toMediaSummary(media: MediaDescriptor) {
  return {
    type: media.type,
    title: media.title,
    year: media.year,
    posterUrl: media.posterUrl,
    genres: [],
    externalRef: media.externalRef,
  };
}

export function toListSummaryDto(list: CustomList): ListSummaryDto {
  return {
    id: list.id,
    name: list.name,
    itemCount: list.itemCount,
    createdAt: list.createdAt.toISOString(),
  };
}

export function toListDetailDto(detail: CustomListDetail): ListDetailDto {
  return {
    id: detail.id,
    name: detail.name,
    createdAt: detail.createdAt.toISOString(),
    items: detail.items.map((entry) => ({
      position: entry.position,
      media: toMediaSummary(entry.media),
    })),
  };
}
