import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { MediaModule } from "../media/media.module";
import { AddMediaToLibraryUseCase } from "./application/add-media-to-library.usecase";
import { GetLibraryUseCase } from "./application/get-library.usecase";
import { GetLibraryItemUseCase } from "./application/get-library-item.usecase";
import { GetSeriesTrackingUseCase } from "./application/get-series-tracking.usecase";
import { RateMediaUseCase } from "./application/rate-media.usecase";
import { RemoveFromLibraryUseCase } from "./application/remove-from-library.usecase";
import {
  DeleteReviewUseCase,
  GetReviewUseCase,
  SaveReviewUseCase,
} from "./application/review.usecases";
import { ToggleEpisodeWatchedUseCase } from "./application/toggle-episode-watched.usecase";
import { ToggleFavoriteUseCase } from "./application/toggle-favorite.usecase";
import { LIBRARY_REPOSITORY, REVIEW_REPOSITORY, SERIES_TRACKING_REPOSITORY } from "./domain";
import { PrismaLibraryRepository } from "./infrastructure/prisma-library.repository";
import { PrismaReviewRepository } from "./infrastructure/prisma-review.repository";
import { PrismaSeriesTrackingRepository } from "./infrastructure/prisma-series-tracking.repository";
import { LibraryController } from "./presentation/library.controller";
import { ReviewController } from "./presentation/review.controller";
import { SeriesTrackingController } from "./presentation/series-tracking.controller";

@Module({
  imports: [AuthenticationModule, MediaModule], // AuthGuard + MediaCatalogProvider
  controllers: [LibraryController, SeriesTrackingController, ReviewController],
  providers: [
    GetLibraryUseCase,
    GetLibraryItemUseCase,
    AddMediaToLibraryUseCase,
    RemoveFromLibraryUseCase,
    ToggleFavoriteUseCase,
    RateMediaUseCase,
    GetSeriesTrackingUseCase,
    ToggleEpisodeWatchedUseCase,
    GetReviewUseCase,
    SaveReviewUseCase,
    DeleteReviewUseCase,
    { provide: LIBRARY_REPOSITORY, useClass: PrismaLibraryRepository },
    { provide: SERIES_TRACKING_REPOSITORY, useClass: PrismaSeriesTrackingRepository },
    { provide: REVIEW_REPOSITORY, useClass: PrismaReviewRepository },
  ],
})
export class LibraryModule {}
