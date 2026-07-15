import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { MediaModule } from "../media/media.module";
import { AddMediaToLibraryUseCase } from "./application/add-media-to-library.usecase";
import { GetHomeDashboardUseCase } from "./application/get-home-dashboard.usecase";
import { GetLibraryUseCase } from "./application/get-library.usecase";
import { GetLibraryItemUseCase } from "./application/get-library-item.usecase";
import { GetSeriesTrackingUseCase } from "./application/get-series-tracking.usecase";
import {
  AddMediaToListUseCase,
  CreateListUseCase,
  DeleteListUseCase,
  GetListUseCase,
  GetListsUseCase,
  RemoveMediaFromListUseCase,
  RenameListUseCase,
} from "./application/list.usecases";
import { RateMediaUseCase } from "./application/rate-media.usecase";
import { RemoveFromLibraryUseCase } from "./application/remove-from-library.usecase";
import {
  DeleteReviewUseCase,
  GetReviewUseCase,
  SaveReviewUseCase,
} from "./application/review.usecases";
import { SetWatchStatusUseCase } from "./application/set-watch-status.usecase";
import { ToggleEpisodeWatchedUseCase } from "./application/toggle-episode-watched.usecase";
import { ToggleEpisodesWatchedUseCase } from "./application/toggle-episodes-watched.usecase";
import { ToggleFavoriteUseCase } from "./application/toggle-favorite.usecase";
import {
  LIBRARY_REPOSITORY,
  LIST_REPOSITORY,
  REVIEW_REPOSITORY,
  SERIES_TRACKING_REPOSITORY,
} from "./domain";
import { PrismaLibraryRepository } from "./infrastructure/prisma-library.repository";
import { PrismaListRepository } from "./infrastructure/prisma-list.repository";
import { PrismaReviewRepository } from "./infrastructure/prisma-review.repository";
import { PrismaSeriesTrackingRepository } from "./infrastructure/prisma-series-tracking.repository";
import { LibraryController } from "./presentation/library.controller";
import { ListController } from "./presentation/list.controller";
import { ReviewController } from "./presentation/review.controller";
import { SeriesTrackingController } from "./presentation/series-tracking.controller";

@Module({
  imports: [AuthenticationModule, MediaModule], // AuthGuard + MediaCatalogProvider
  controllers: [LibraryController, SeriesTrackingController, ReviewController, ListController],
  providers: [
    GetLibraryUseCase,
    GetLibraryItemUseCase,
    AddMediaToLibraryUseCase,
    RemoveFromLibraryUseCase,
    ToggleFavoriteUseCase,
    RateMediaUseCase,
    SetWatchStatusUseCase,
    GetSeriesTrackingUseCase,
    GetHomeDashboardUseCase,
    ToggleEpisodeWatchedUseCase,
    ToggleEpisodesWatchedUseCase,
    GetReviewUseCase,
    SaveReviewUseCase,
    DeleteReviewUseCase,
    CreateListUseCase,
    GetListsUseCase,
    GetListUseCase,
    RenameListUseCase,
    DeleteListUseCase,
    AddMediaToListUseCase,
    RemoveMediaFromListUseCase,
    { provide: LIBRARY_REPOSITORY, useClass: PrismaLibraryRepository },
    { provide: SERIES_TRACKING_REPOSITORY, useClass: PrismaSeriesTrackingRepository },
    { provide: REVIEW_REPOSITORY, useClass: PrismaReviewRepository },
    { provide: LIST_REPOSITORY, useClass: PrismaListRepository },
  ],
})
export class LibraryModule {}
