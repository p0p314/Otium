-- Instantané quotidien des livres populaires (ADR-0019).
-- Migration ADDITIVE : une table isolée, aucune donnée existante touchée.

CREATE TABLE "TrendingSnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "coverUrl" TEXT,
    "description" TEXT,
    "publishedDate" TEXT,
    "infoUrl" TEXT,
    "rating" DOUBLE PRECISION,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingSnapshot_pkey" PRIMARY KEY ("id")
);

-- Le rang est unique par source : deux livres ne peuvent pas occuper la même place.
CREATE UNIQUE INDEX "TrendingSnapshot_source_position_key" ON "TrendingSnapshot"("source", "position");
CREATE INDEX "TrendingSnapshot_source_position_idx" ON "TrendingSnapshot"("source", "position");
