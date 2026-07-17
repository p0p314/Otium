import { Body, Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from "@nestjs/common";
import {
  type EpisodeReview as EpisodeReviewDto,
  type EpisodeReviewResponse,
  SaveEpisodeReviewInput,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import type { EpisodeReview } from "../domain";
import {
  DeleteEpisodeReviewUseCase,
  GetEpisodeReviewUseCase,
  SaveEpisodeReviewUseCase,
} from "../application/episode-review.usecases";

function toDto(review: EpisodeReview): EpisodeReviewDto {
  return { rating: review.rating, body: review.body, updatedAt: review.updatedAt.toISOString() };
}

@Controller("library")
@UseGuards(AuthGuard)
export class EpisodeReviewController {
  constructor(
    private readonly getReview: GetEpisodeReviewUseCase,
    private readonly saveReview: SaveEpisodeReviewUseCase,
    private readonly deleteReview: DeleteEpisodeReviewUseCase,
  ) {}

  @Get(":itemId/episodes/:episodeId/review")
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Param("episodeId") episodeId: string,
  ): Promise<EpisodeReviewResponse> {
    const review = await this.getReview.execute(user.id, itemId, episodeId);
    return { review: review ? toDto(review) : null };
  }

  @Put(":itemId/episodes/:episodeId/review")
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Param("episodeId") episodeId: string,
    @Body(new ZodValidationPipe(SaveEpisodeReviewInput)) input: SaveEpisodeReviewInput,
  ): Promise<EpisodeReviewResponse> {
    const review = await this.saveReview.execute(user.id, itemId, episodeId, {
      rating: input.rating,
      body: input.body,
    });
    return { review: review ? toDto(review) : null };
  }

  @Delete(":itemId/episodes/:episodeId/review")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Param("episodeId") episodeId: string,
  ): Promise<void> {
    await this.deleteReview.execute(user.id, itemId, episodeId);
  }
}
