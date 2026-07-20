import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  CATALOG_PROVIDER_REGISTRATIONS,
  type CatalogMediaType,
  type CatalogProviderRegistration,
  type MediaCatalogProvider,
  type MediaCatalogRegistry,
} from "../domain";

/**
 * Registry par type de média (ADR-0015). Construit une table `type → fournisseur` à partir
 * des enregistrements déclarés par le module. Le premier enregistrement gagne en cas de
 * doublon (l'ordre de déclaration fait foi), ce qui rend la configuration prévisible.
 */
@Injectable()
export class TypeBasedMediaCatalogRegistry implements MediaCatalogRegistry {
  private readonly byType = new Map<CatalogMediaType, MediaCatalogProvider>();

  constructor(
    @Inject(CATALOG_PROVIDER_REGISTRATIONS)
    registrations: readonly CatalogProviderRegistration[],
  ) {
    for (const { types, provider } of registrations) {
      for (const type of types) {
        if (!this.byType.has(type)) this.byType.set(type, provider);
      }
    }
  }

  forType(type: CatalogMediaType): MediaCatalogProvider {
    const provider = this.byType.get(type);
    if (!provider) {
      throw new NotFoundException(`Aucun catalogue ne couvre le type de média « ${type} ».`);
    }
    return provider;
  }

  supports(type: CatalogMediaType): boolean {
    return this.byType.has(type);
  }

  supportedTypes(): readonly CatalogMediaType[] {
    return [...this.byType.keys()];
  }
}
