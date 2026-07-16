import { Body, Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from "@nestjs/common";
import { type Review as ReviewDto, type ReviewResponse, SaveReviewInput } from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import type { Review } from "../domain";
import {
  DeleteReviewUseCase,
  GetReviewUseCase,
  SaveReviewUseCase,
} from "../application/review.usecases";

function toDto(review: Review): ReviewDto {
  return { body: review.body, updatedAt: review.updatedAt.toISOString() };
}

@Controller("library")
@UseGuards(AuthGuard)
export class ReviewController {
  constructor(
    private readonly getReview: GetReviewUseCase,
    private readonly saveReview: SaveReviewUseCase,
    private readonly deleteReview: DeleteReviewUseCase,
  ) {}

  @Get(":itemId/review")
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ): Promise<ReviewResponse> {
    const review = await this.getReview.execute(user.id, itemId);
    return { review: review ? toDto(review) : null };
  }

  @Put(":itemId/review")
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(SaveReviewInput)) input: SaveReviewInput,
  ): Promise<ReviewDto> {
    return toDto(await this.saveReview.execute(user.id, itemId, input.body));
  }

  @Delete(":itemId/review")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ): Promise<void> {
    await this.deleteReview.execute(user.id, itemId);
  }
}
