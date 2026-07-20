import type {
  LibraryItem as LibraryItemDto,
  MediaProgress,
  MediaSummary,
} from "@otium/types";
import { computeProgress, type LibraryItem, type MediaDescriptor } from "../domain";

/**
 * Convertit un résumé de média (contrat) vers le descripteur du domaine. Les genres
 * sont réduits à leurs libellés ; ils sont complétés à l'ajout via le catalogue.
 */
export function toMediaDescriptor(summary: MediaSummary): MediaDescriptor {
  return {
    externalRef: summary.externalRef,
    type: summary.type,
    title: summary.title,
    year: summary.year,
    posterUrl: summary.posterUrl,
    genres: summary.genres.map((g) => g.label),
  };
}

/** Convertit un élément de bibliothèque du domaine vers le DTO de contrat. */
export function toLibraryItemDto(item: LibraryItem): LibraryItemDto {
  return {
    id: item.id,
    media: {
      type: item.media.type,
      title: item.media.title,
      year: item.media.year,
      posterUrl: item.media.posterUrl,
      // Libellés persistés à l'ajout (id = libellé, faute d'identifiant de genre stocké) :
      // alimentent le filtre par genre de la recherche avancée, sans requête supplémentaire.
      genres: (item.media.genres ?? []).map((label) => ({ id: label, label })),
      externalRef: item.media.externalRef,
    },
    status: item.status,
    rating: item.rating,
    isFavorite: item.isFavorite,
    addedAt: item.addedAt.toISOString(),
    lastActivityAt: item.lastActivityAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    finishedAt: item.finishedAt?.toISOString() ?? null,
    progress: toProgressDto(item),
  };
}

/**
 * Expose la progression **déjà calculée** (pourcentage, restant) : le calcul vit dans le
 * domaine et n'est pas rejoué par les clients — une seule vérité, aucun écart possible.
 */
function toProgressDto(item: LibraryItem): MediaProgress | null {
  if (!item.progress) return null;
  const view = computeProgress(item.progress);
  return {
    unit: view.unit,
    value: view.value,
    total: view.total,
    percent: view.percent,
    remaining: view.remaining,
    // La progression suit l'activité de l'élément : pas d'horodatage propre en base.
    updatedAt: item.lastActivityAt.toISOString(),
  };
}
