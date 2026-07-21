import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  AddToLibraryInput,
  type CollectionTracking,
  type HomeDashboard,
  type LibraryItem as LibraryItemDto,
  type UpcomingDashboard,
  RateMediaInput,
  SetConsumptionDatesInput,
  SetWatchStatusInput,
  ToggleFavoriteInput,
  UpdateProgressInput,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import { AddMediaToLibraryUseCase } from "../application/add-media-to-library.usecase";
import { GetHomeDashboardUseCase } from "../application/get-home-dashboard.usecase";
import { GetUpcomingUseCase } from "../application/get-upcoming.usecase";
import { GetLibraryUseCase } from "../application/get-library.usecase";
import { GetCollectionTrackingUseCase } from "../application/get-collection-tracking.usecase";
import { GetLibraryItemUseCase } from "../application/get-library-item.usecase";
import { RateMediaUseCase } from "../application/rate-media.usecase";
import { RemoveFromLibraryUseCase } from "../application/remove-from-library.usecase";
import { SetWatchStatusUseCase } from "../application/set-watch-status.usecase";
import { ToggleFavoriteUseCase } from "../application/toggle-favorite.usecase";
import {
  SetConsumptionDatesUseCase,
  UpdateProgressUseCase,
} from "../application/update-progress.usecase";
import { toLibraryItemDto, toMediaDescriptor } from "./library.mapper";

@Controller("library")
@UseGuards(AuthGuard)
export class LibraryController {
  constructor(
    private readonly getLibrary: GetLibraryUseCase,
    private readonly getItem: GetLibraryItemUseCase,
    private readonly addMedia: AddMediaToLibraryUseCase,
    private readonly removeMedia: RemoveFromLibraryUseCase,
    private readonly toggleFavorite: ToggleFavoriteUseCase,
    private readonly rateMedia: RateMediaUseCase,
    private readonly setWatchStatus: SetWatchStatusUseCase,
    private readonly getHomeDashboard: GetHomeDashboardUseCase,
    private readonly getUpcoming: GetUpcomingUseCase,
    private readonly getCollection: GetCollectionTrackingUseCase,
    private readonly updateProgress: UpdateProgressUseCase,
    private readonly setDates: SetConsumptionDatesUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<LibraryItemDto[]> {
    const items = await this.getLibrary.execute(user.id);
    return items.map(toLibraryItemDto);
  }

  /** Tableau de bord de l'accueil (à reprendre + à commencer, par type de média). */
  @Get("home")
  async home(@CurrentUser() user: AuthenticatedUser): Promise<HomeDashboard> {
    return this.getHomeDashboard.execute(user.id);
  }

  /** Agenda « À venir » : épisodes à diffusion future des séries suivies. */
  @Get("upcoming")
  async upcoming(@CurrentUser() user: AuthenticatedUser): Promise<UpcomingDashboard> {
    return this.getUpcoming.execute(user.id);
  }

  /**
   * `GET /api/library/collections/:provider/:externalId` — fiche d'une œuvre et suivi de
   * ses volumes. Déclarée **avant** `:itemId`, sans quoi « collections » serait interprété
   * comme un identifiant d'élément.
   */
  @Get("collections/:provider/:externalId")
  async collection(
    @CurrentUser() user: AuthenticatedUser,
    @Param("provider") provider: string,
    @Param("externalId") externalId: string,
  ): Promise<CollectionTracking> {
    const tracking = await this.getCollection.execute({ userId: user.id, provider, externalId });
    return { ...tracking, volumes: [...tracking.volumes] };
  }

  @Get(":itemId")
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ): Promise<LibraryItemDto> {
    return toLibraryItemDto(await this.getItem.execute({ userId: user.id, itemId }));
  }

  @Post()
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AddToLibraryInput)) input: AddToLibraryInput,
  ): Promise<LibraryItemDto> {
    const item = await this.addMedia.execute({
      userId: user.id,
      media: toMediaDescriptor(input.media),
    });
    return toLibraryItemDto(item);
  }

  @Delete(":itemId")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ): Promise<void> {
    await this.removeMedia.execute({ userId: user.id, itemId });
  }

  @Patch(":itemId/favorite")
  async favorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(ToggleFavoriteInput)) input: ToggleFavoriteInput,
  ): Promise<LibraryItemDto> {
    const item = await this.toggleFavorite.execute({
      userId: user.id,
      itemId,
      isFavorite: input.isFavorite,
    });
    return toLibraryItemDto(item);
  }

  @Patch(":itemId/status")
  async status(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(SetWatchStatusInput)) input: SetWatchStatusInput,
  ): Promise<LibraryItemDto> {
    const item = await this.setWatchStatus.execute({
      userId: user.id,
      itemId,
      status: input.status,
    });
    return toLibraryItemDto(item);
  }

  /** Avancement d'un média à progression continue (livre : pages ou pourcentage). */
  @Patch(":itemId/progress")
  async progress(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(UpdateProgressInput)) input: UpdateProgressInput,
  ): Promise<LibraryItemDto> {
    const item = await this.updateProgress.execute({
      userId: user.id,
      itemId,
      unit: input.unit,
      value: input.value,
      ...(input.total !== undefined ? { total: input.total } : {}),
    });
    return toLibraryItemDto(item);
  }

  /** Dates de début/fin de consommation saisies par l'utilisateur. */
  @Patch(":itemId/dates")
  async dates(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(SetConsumptionDatesInput)) input: SetConsumptionDatesInput,
  ): Promise<LibraryItemDto> {
    const item = await this.setDates.execute({
      userId: user.id,
      itemId,
      ...(input.startedAt !== undefined
        ? { startedAt: input.startedAt === null ? null : new Date(input.startedAt) }
        : {}),
      ...(input.finishedAt !== undefined
        ? { finishedAt: input.finishedAt === null ? null : new Date(input.finishedAt) }
        : {}),
    });
    return toLibraryItemDto(item);
  }

  @Patch(":itemId/rating")
  async rate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(RateMediaInput)) input: RateMediaInput,
  ): Promise<LibraryItemDto> {
    const item = await this.rateMedia.execute({ userId: user.id, itemId, rating: input.rating });
    return toLibraryItemDto(item);
  }
}
