import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  type MediaDetails,
  MediaType,
  SearchMediaQuery,
  type SearchMediaResult,
  TrendingMediaQuery,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { GetMediaDetailsUseCase } from "../application/queries/get-media-details.usecase";
import { GetTrendingMediaUseCase } from "../application/queries/get-trending-media.usecase";
import { SearchMediaUseCase } from "../application/queries/search-media.usecase";
import { toMediaDetailsDto } from "./media-details.mapper";
import { toSearchMediaResult } from "./media.mapper";

@Controller("media")
export class MediaController {
  constructor(
    private readonly searchMedia: SearchMediaUseCase,
    private readonly getTrending: GetTrendingMediaUseCase,
    private readonly getDetails: GetMediaDetailsUseCase,
  ) {}

  /** `GET /api/media/search?q=...&type=&page=&pageSize=` — recherche dans le catalogue. */
  @Get("search")
  async search(
    @Query(new ZodValidationPipe(SearchMediaQuery)) query: SearchMediaQuery,
  ): Promise<SearchMediaResult> {
    const result = await this.searchMedia.execute(query);
    return toSearchMediaResult(result);
  }

  /** `GET /api/media/trending?type=&page=&pageSize=` — tendances du moment. */
  @Get("trending")
  async trending(
    @Query(new ZodValidationPipe(TrendingMediaQuery)) query: TrendingMediaQuery,
  ): Promise<SearchMediaResult> {
    const result = await this.getTrending.execute(query);
    return toSearchMediaResult(result);
  }

  /** `GET /api/media/:type/:externalId` — fiche détaillée d'un film ou d'une série. */
  @Get(":type/:externalId")
  async details(
    @Param("type", new ZodValidationPipe(MediaType)) type: MediaType,
    @Param("externalId") externalId: string,
  ): Promise<MediaDetails> {
    const details = await this.getDetails.execute({ type, externalId });
    return toMediaDetailsDto(details);
  }
}
