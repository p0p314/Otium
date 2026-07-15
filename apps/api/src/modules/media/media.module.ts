import { Module } from "@nestjs/common";
import { GetMediaDetailsUseCase } from "./application/queries/get-media-details.usecase";
import { GetTrendingMediaUseCase } from "./application/queries/get-trending-media.usecase";
import { SearchMediaUseCase } from "./application/queries/search-media.usecase";
import { MEDIA_CATALOG_PROVIDER } from "./domain";
import { TmdbProvider } from "./infrastructure/providers/tmdb/tmdb.provider";
import { MediaController } from "./presentation/media.controller";

@Module({
  controllers: [MediaController],
  providers: [
    SearchMediaUseCase,
    GetTrendingMediaUseCase,
    GetMediaDetailsUseCase,
    TmdbProvider,
    // Liaison port → adapter. Changer de fournisseur = changer cette seule ligne (ADR-0004).
    { provide: MEDIA_CATALOG_PROVIDER, useExisting: TmdbProvider },
  ],
  exports: [MEDIA_CATALOG_PROVIDER],
})
export class MediaModule {}
