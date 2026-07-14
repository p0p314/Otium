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
  type LibraryItem as LibraryItemDto,
  ToggleFavoriteInput,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import {
  AuthGuard,
  type AuthenticatedUser,
} from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import { AddMediaToLibraryUseCase } from "../application/add-media-to-library.usecase";
import { GetLibraryUseCase } from "../application/get-library.usecase";
import { RemoveFromLibraryUseCase } from "../application/remove-from-library.usecase";
import { ToggleFavoriteUseCase } from "../application/toggle-favorite.usecase";
import { toLibraryItemDto } from "./library.mapper";

@Controller("library")
@UseGuards(AuthGuard)
export class LibraryController {
  constructor(
    private readonly getLibrary: GetLibraryUseCase,
    private readonly addMedia: AddMediaToLibraryUseCase,
    private readonly removeMedia: RemoveFromLibraryUseCase,
    private readonly toggleFavorite: ToggleFavoriteUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<LibraryItemDto[]> {
    const items = await this.getLibrary.execute(user.id);
    return items.map(toLibraryItemDto);
  }

  @Post()
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AddToLibraryInput)) input: AddToLibraryInput,
  ): Promise<LibraryItemDto> {
    const item = await this.addMedia.execute({ userId: user.id, media: input.media });
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
}
