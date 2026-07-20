import type { CatalogMediaType } from "../models/catalog-media";
import type { MediaCatalogProvider } from "./media-catalog.provider";

/**
 * Sélectionne le fournisseur de catalogue compétent pour un type de média (ADR-0015).
 * C'est **le seul** endroit qui sait « films/séries → TMDB, livres → Google Books » ;
 * les use cases restent ignorants des fournisseurs. Ajouter un type de média = enregistrer
 * un adapter supplémentaire, sans modifier le métier (Open/Closed).
 */
export interface MediaCatalogRegistry {
  /** Fournisseur compétent pour ce type. Lève une erreur si aucun n'est enregistré. */
  forType(type: CatalogMediaType): MediaCatalogProvider;
  /** Indique si un fournisseur couvre ce type (sans lever d'erreur). */
  supports(type: CatalogMediaType): boolean;
  /** Types de média couverts par au moins un fournisseur. */
  supportedTypes(): readonly CatalogMediaType[];
}

/** Jeton d'injection (DI) du registry. */
export const MEDIA_CATALOG_REGISTRY = Symbol("MEDIA_CATALOG_REGISTRY");

/**
 * Déclaration « ce fournisseur couvre ces types », fournie par la couche module.
 * Permet d'ajouter un catalogue sans toucher au registry lui-même.
 */
export interface CatalogProviderRegistration {
  readonly types: readonly CatalogMediaType[];
  readonly provider: MediaCatalogProvider;
}

/** Jeton d'injection (DI) de la liste des enregistrements. */
export const CATALOG_PROVIDER_REGISTRATIONS = Symbol("CATALOG_PROVIDER_REGISTRATIONS");
