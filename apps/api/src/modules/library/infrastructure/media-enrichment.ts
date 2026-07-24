import type { Prisma } from "@prisma/client";
import type { MediaDescriptor } from "../domain";

/** Champs partagés d'un média que l'on peut **compléter** (jamais écraser). */
export interface EnrichableMedia {
  readonly posterUrl: string | null;
  readonly year: number | null;
  readonly genres: readonly string[];
  readonly runtimeMinutes: number | null;
  readonly releaseDate: Date | null;
}

/**
 * Calcule un patch d'**enrichissement** des champs partagés d'un média déjà présent, à
 * partir d'un descriptor fourni par le client. Règle de sécurité (audit VULN-11) : le média
 * générique est partagé entre tous les utilisateurs et dédupliqué par `(provider, externalId)`.
 * On ne **complète** donc que les champs actuellement vides — jamais on n'écrase une valeur
 * déjà posée (sinon un utilisateur pourrait falsifier le titre/l'affiche vus par les autres,
 * voire injecter une URL d'affiche de traçage). Le `title` n'est jamais dans le patch : il est
 * figé à la création.
 *
 * Retourne un patch vide si rien n'est à compléter (aucune écriture inutile — éco-conception).
 */
export function enrichMediaPatch(
  existing: EnrichableMedia,
  descriptor: MediaDescriptor,
): Prisma.MediaUpdateInput {
  const patch: Prisma.MediaUpdateInput = {};

  if (!existing.posterUrl && descriptor.posterUrl) patch.posterUrl = descriptor.posterUrl;
  if (existing.year == null && descriptor.year != null) patch.year = descriptor.year;
  if (existing.genres.length === 0 && descriptor.genres && descriptor.genres.length > 0) {
    patch.genres = [...descriptor.genres];
  }
  if (existing.runtimeMinutes == null && descriptor.runtimeMinutes != null) {
    patch.runtimeMinutes = descriptor.runtimeMinutes;
  }
  if (existing.releaseDate == null && descriptor.releaseDate != null) {
    patch.releaseDate = descriptor.releaseDate;
  }
  return patch;
}
