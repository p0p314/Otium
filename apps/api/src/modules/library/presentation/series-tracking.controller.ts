import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { MarkEpisodeInput, MarkEpisodesInput, type SeriesTracking } from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import {
  AuthGuard,
  type AuthenticatedUser,
} from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import { GetSeriesTrackingUseCase } from "../application/get-series-tracking.usecase";
import { ToggleEpisodeWatchedUseCase } from "../application/toggle-episode-watched.usecase";
import { ToggleEpisodesWatchedUseCase } from "../application/toggle-episodes-watched.usecase";

@Controller("library")
@UseGuards(AuthGuard)
export class SeriesTrackingController {
  constructor(
    private readonly getTracking: GetSeriesTrackingUseCase,
    private readonly toggleEpisode: ToggleEpisodeWatchedUseCase,
    private readonly toggleEpisodes: ToggleEpisodesWatchedUseCase,
  ) {}

  /** Suivi complet d'une série (saisons/épisodes, progression, reprise). */
  @Get(":itemId/series")
  series(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ): Promise<SeriesTracking> {
    return this.getTracking.execute({ userId: user.id, itemId });
  }

  /** Marque un épisode vu/non vu. */
  @Patch(":itemId/episodes")
  markEpisode(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(MarkEpisodeInput)) input: MarkEpisodeInput,
  ): Promise<SeriesTracking> {
    return this.toggleEpisode.execute({
      userId: user.id,
      itemId,
      episodeId: input.episodeId,
      watched: input.watched,
    });
  }

  /** Marque/démarque plusieurs épisodes en une fois (saison ou série complète). */
  @Patch(":itemId/episodes/batch")
  markEpisodes(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(MarkEpisodesInput)) input: MarkEpisodesInput,
  ): Promise<SeriesTracking> {
    return this.toggleEpisodes.execute({
      userId: user.id,
      itemId,
      episodeIds: input.episodeIds,
      watched: input.watched,
    });
  }
}
