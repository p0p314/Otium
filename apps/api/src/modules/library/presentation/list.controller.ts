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
  AddToListInput,
  CreateListInput,
  type ListDetail as ListDetailDto,
  type ListSummary as ListSummaryDto,
  RenameListInput,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import {
  AddMediaToListUseCase,
  CreateListUseCase,
  DeleteListUseCase,
  GetListUseCase,
  GetListsUseCase,
  RemoveMediaFromListUseCase,
  RenameListUseCase,
} from "../application/list.usecases";
import { toMediaDescriptor } from "./library.mapper";
import { toListDetailDto, toListSummaryDto } from "./list.mapper";

@Controller("lists")
@UseGuards(AuthGuard)
export class ListController {
  constructor(
    private readonly createList: CreateListUseCase,
    private readonly getLists: GetListsUseCase,
    private readonly getList: GetListUseCase,
    private readonly renameList: RenameListUseCase,
    private readonly deleteList: DeleteListUseCase,
    private readonly addMedia: AddMediaToListUseCase,
    private readonly removeMedia: RemoveMediaFromListUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<ListSummaryDto[]> {
    const lists = await this.getLists.execute(user.id);
    return lists.map(toListSummaryDto);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateListInput)) input: CreateListInput,
  ): Promise<ListSummaryDto> {
    return toListSummaryDto(await this.createList.execute(user.id, input.name));
  }

  @Get(":listId")
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listId") listId: string,
  ): Promise<ListDetailDto> {
    return toListDetailDto(await this.getList.execute(user.id, listId));
  }

  @Patch(":listId")
  async rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listId") listId: string,
    @Body(new ZodValidationPipe(RenameListInput)) input: RenameListInput,
  ): Promise<ListSummaryDto> {
    return toListSummaryDto(await this.renameList.execute(user.id, listId, input.name));
  }

  @Delete(":listId")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listId") listId: string,
  ): Promise<void> {
    await this.deleteList.execute(user.id, listId);
  }

  @Post(":listId/items")
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listId") listId: string,
    @Body(new ZodValidationPipe(AddToListInput)) input: AddToListInput,
  ): Promise<ListDetailDto> {
    const detail = await this.addMedia.execute(user.id, listId, toMediaDescriptor(input.media));
    return toListDetailDto(detail);
  }

  @Delete(":listId/items/:provider/:externalId")
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("listId") listId: string,
    @Param("provider") provider: string,
    @Param("externalId") externalId: string,
  ): Promise<ListDetailDto> {
    const detail = await this.removeMedia.execute(user.id, listId, { provider, externalId });
    return toListDetailDto(detail);
  }
}
