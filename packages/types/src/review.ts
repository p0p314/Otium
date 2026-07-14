import { z } from "zod";

/** Avis (texte libre) d'un utilisateur sur un média. Un seul avis par (user, media). */
export const Review = z.object({
  body: z.string(),
  updatedAt: z.string().datetime(),
});
export type Review = z.infer<typeof Review>;

/** Réponse de lecture d'avis : enveloppe explicite (null = pas encore d'avis). */
export const ReviewResponse = z.object({
  review: Review.nullable(),
});
export type ReviewResponse = z.infer<typeof ReviewResponse>;

export const SaveReviewInput = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type SaveReviewInput = z.infer<typeof SaveReviewInput>;
