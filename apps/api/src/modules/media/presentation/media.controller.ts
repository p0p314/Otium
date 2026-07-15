import { Controller, Get, Query } from "@nestjs/common";
import {
  SearchMediaQuery,
  type SearchMediaResult,
  TrendingMediaQuery,
} from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { GetTrendingMediaUseCase } from "../application/queries/get-trending-media.usecase";
import { SearchMediaUseCase } from "../application/queries/search-media.usecase";
import { toSearchMediaResult } from "./media.mapper";

@Controller("media")
export class MediaController {
  constructor(
    private readonly searchMedia: SearchMediaUseCase,
    private readonly getTrending: GetTrendingMediaUseCase,
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
}
