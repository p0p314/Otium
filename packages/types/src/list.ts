import { z } from "zod";
import { MediaSummary } from "./media.js";

/** Nom de liste : non vide, borné (contrainte partagée front/back). */
export const listName = z.string().trim().min(1).max(80);

/** Résumé d'une liste personnalisée (aperçu, sans les éléments). */
export const ListSummary = z.object({
  id: z.string(),
  name: z.string(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type ListSummary = z.infer<typeof ListSummary>;

/** Un média présent dans une liste, avec sa position d'affichage. */
export const ListEntry = z.object({
  media: MediaSummary,
  position: z.number().int().nonnegative(),
});
export type ListEntry = z.infer<typeof ListEntry>;

/** Détail complet d'une liste (métadonnées + éléments ordonnés). */
export const ListDetail = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  items: z.array(ListEntry),
});
export type ListDetail = z.infer<typeof ListDetail>;

export const CreateListInput = z.object({ name: listName });
export type CreateListInput = z.infer<typeof CreateListInput>;

export const RenameListInput = z.object({ name: listName });
export type RenameListInput = z.infer<typeof RenameListInput>;

/** Ajout d'un média à une liste : le client transmet le résumé issu de la recherche. */
export const AddToListInput = z.object({ media: MediaSummary });
export type AddToListInput = z.infer<typeof AddToListInput>;
