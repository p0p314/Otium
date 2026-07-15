import type { CustomList, CustomListDetail } from "../models/custom-list";
import type { MediaDescriptor } from "../models/library-item";

/**
 * Port de persistance des listes personnalisées. L'ajout d'un média persiste aussi
 * le média sous-jacent (upsert par `externalRef`) — le domaine ignore ce détail.
 * Toutes les opérations sont scopées à l'utilisateur (isolation des données).
 */
export interface ListRepository {
  create(userId: string, name: string): Promise<CustomList>;
  findByUser(userId: string): Promise<CustomList[]>;
  findDetail(userId: string, listId: string): Promise<CustomListDetail | null>;
  rename(userId: string, listId: string, name: string): Promise<CustomList | null>;
  /** Supprime la liste ; renvoie `false` si elle n'existe pas (ou pas au propriétaire). */
  remove(userId: string, listId: string): Promise<boolean>;
  /** Ajoute un média (idempotent) ; renvoie le détail à jour, ou `null` si liste absente. */
  addMedia(
    userId: string,
    listId: string,
    media: MediaDescriptor,
  ): Promise<CustomListDetail | null>;
  /** Retire un média identifié par sa référence externe ; `null` si liste absente. */
  removeMedia(
    userId: string,
    listId: string,
    externalRef: { provider: string; externalId: string },
  ): Promise<CustomListDetail | null>;
}

export const LIST_REPOSITORY = Symbol("LIST_REPOSITORY");
