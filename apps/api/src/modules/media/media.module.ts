import { Module } from "@nestjs/common";
import { GetEpisodeDetailsUseCase } from "./application/queries/get-episode-details.usecase";
import { GetMediaDetailsUseCase } from "./application/queries/get-media-details.usecase";
import { GetTrendingMediaUseCase } from "./application/queries/get-trending-media.usecase";
import { SearchMediaUseCase } from "./application/queries/search-media.usecase";
import {
  CATALOG_PROVIDER_REGISTRATIONS,
  type CatalogProviderRegistration,
  MEDIA_CATALOG_REGISTRY,
  SERIES_CATALOG_PROVIDER,
  TRENDING_CATALOG_PROVIDER,
} from "./domain";
import { TmdbProvider } from "./infrastructure/providers/tmdb/tmdb.provider";
import { TypeBasedMediaCatalogRegistry } from "./infrastructure/type-based-media-catalog.registry";
import { MediaController } from "./presentation/media.controller";

@Module({
  controllers: [MediaController],
  providers: [
    SearchMediaUseCase,
    GetTrendingMediaUseCase,
    GetMediaDetailsUseCase,
    GetEpisodeDetailsUseCase,
    TmdbProvider,
    // Liaisons port → adapter. **Seul** endroit qui connaît les fournisseurs concrets :
    // ajouter un catalogue = ajouter un enregistrement ici, sans toucher au métier
    // (ADR-0004 / ADR-0015).
    {
      provide: CATALOG_PROVIDER_REGISTRATIONS,
      useFactory: (tmdb: TmdbProvider): CatalogProviderRegistration[] => [
        { types: ["MOVIE", "SERIES"], provider: tmdb },
      ],
      inject: [TmdbProvider],
    },
    { provide: MEDIA_CATALOG_REGISTRY, useClass: TypeBasedMediaCatalogRegistry },
    // Capacités optionnelles, portées par TMDB en V1.
    { provide: SERIES_CATALOG_PROVIDER, useExisting: TmdbProvider },
    { provide: TRENDING_CATALOG_PROVIDER, useExisting: TmdbProvider },
  ],
  exports: [MEDIA_CATALOG_REGISTRY, SERIES_CATALOG_PROVIDER, TRENDING_CATALOG_PROVIDER],
})
export class MediaModule {}
