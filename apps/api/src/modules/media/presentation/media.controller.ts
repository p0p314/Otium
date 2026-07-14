import { Controller, Get, Query } from "@nestjs/common";
import { SearchMediaQuery, type SearchMediaResult } from "@otium/types";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { SearchMediaUseCase } from "../application/queries/search-media.usecase";
import { toSearchMediaResult } from "./media.mapper";

@Controller("media")
export class MediaController {
  constructor(private readonly searchMedia: SearchMediaUseCase) {}

  /** `GET /api/media/search?q=...&type=&page=&pageSize=` — recherche dans le catalogue. */
  @Get("search")
  async search(
    @Query(new ZodValidationPipe(SearchMediaQuery)) query: SearchMediaQuery,
  ): Promise<SearchMediaResult> {
    const result = await this.searchMedia.execute(query);
    return toSearchMediaResult(result);
  }
}
