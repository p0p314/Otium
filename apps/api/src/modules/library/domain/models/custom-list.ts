import type { MediaDescriptor } from "./library-item";

/**
 * Liste personnalisée : regroupement de médias nommé, propre à un utilisateur.
 * Capacité transversale au niveau `Media` (ADR-0003) — une liste peut mêler films
 * et séries (et, à terme, tout autre type de média).
 */
export interface CustomList {
  readonly id: string;
  readonly name: string;
  readonly itemCount: number;
  readonly createdAt: Date;
}

export interface CustomListEntry {
  readonly media: MediaDescriptor;
  readonly position: number;
}

export interface CustomListDetail {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly items: readonly CustomListEntry[];
}
