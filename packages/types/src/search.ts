import { z } from "zod";
import { MediaSummary, MediaType } from "./media.js";

export const SearchMediaQuery = z.object({
  q: z.string().min(1).max(200),
  type: MediaType.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type SearchMediaQuery = z.infer<typeof SearchMediaQuery>;

export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  });

export const SearchMediaResult = Paginated(MediaSummary);
export type SearchMediaResult = z.infer<typeof SearchMediaResult>;

/** Tendances du moment (films/séries), pour la mise en avant sous la recherche. */
export const TrendingMediaQuery = z.object({
  type: MediaType.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type TrendingMediaQuery = z.infer<typeof TrendingMediaQuery>;
