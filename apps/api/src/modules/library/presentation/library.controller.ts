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
  type HomeDashboard,
  type LibraryItem as LibraryItemDto,
  RateMediaInput,
  SetWatchStatusInput,
  ToggleFavoriteInput,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import {
  AuthGuard,
  type AuthenticatedUser,
} from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import { AddMediaToLibraryUseCase } from "../application/add-media-to-library.usecase";
import { GetHomeDashboardUseCase } from "../application/get-home-dashboard.usecase";
import { GetLibraryUseCase } from "../application/get-library.usecase";
import { GetLibraryItemUseCase } from "../application/get-library-item.usecase";
import { RateMediaUseCase } from "../application/rate-media.usecase";
import { RemoveFromLibraryUseCase } from "../application/remove-from-library.usecase";
import { SetWatchStatusUseCase } from "../application/set-watch-status.usecase";
import { ToggleFavoriteUseCase } from "../application/toggle-favorite.usecase";
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
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<LibraryItemDto[]> {
    const items = await this.getLibrary.execute(user.id);
    return items.map(toLibraryItemDto);
  }

  /** Tableau de bord de l'accueil (séries en cours + laissées de côté). */
  @Get("home")
  async home(@CurrentUser() user: AuthenticatedUser): Promise<HomeDashboard> {
    return this.getHomeDashboard.execute(user.id);
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
