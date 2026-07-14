import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { MediaModule } from "../media/media.module";
import { AddMediaToLibraryUseCase } from "./application/add-media-to-library.usecase";
import { GetLibraryUseCase } from "./application/get-library.usecase";
import { GetSeriesTrackingUseCase } from "./application/get-series-tracking.usecase";
import { RemoveFromLibraryUseCase } from "./application/remove-from-library.usecase";
import { ToggleEpisodeWatchedUseCase } from "./application/toggle-episode-watched.usecase";
import { ToggleFavoriteUseCase } from "./application/toggle-favorite.usecase";
import { LIBRARY_REPOSITORY, SERIES_TRACKING_REPOSITORY } from "./domain";
import { PrismaLibraryRepository } from "./infrastructure/prisma-library.repository";
import { PrismaSeriesTrackingRepository } from "./infrastructure/prisma-series-tracking.repository";
import { LibraryController } from "./presentation/library.controller";
import { SeriesTrackingController } from "./presentation/series-tracking.controller";

@Module({
  imports: [AuthenticationModule, MediaModule], // AuthGuard + MediaCatalogProvider
  controllers: [LibraryController, SeriesTrackingController],
  providers: [
    GetLibraryUseCase,
    AddMediaToLibraryUseCase,
    RemoveFromLibraryUseCase,
    ToggleFavoriteUseCase,
    GetSeriesTrackingUseCase,
    ToggleEpisodeWatchedUseCase,
    { provide: LIBRARY_REPOSITORY, useClass: PrismaLibraryRepository },
    { provide: SERIES_TRACKING_REPOSITORY, useClass: PrismaSeriesTrackingRepository },
  ],
})
export class LibraryModule {}
