-- Œuvres regroupant plusieurs médias (série de tomes, cycle de romans).
-- Migration strictement ADDITIVE : aucune colonne existante n'est modifiée, les médias
-- déjà en base restent simplement non rattachés (`collectionId` NULL).

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "collectionId" TEXT,
ADD COLUMN     "collectionPosition" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Collection_provider_externalId_key" ON "Collection"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Media_collectionId_collectionPosition_idx" ON "Media"("collectionId", "collectionPosition");

-- AddForeignKey
-- `SET NULL` plutôt que `CASCADE` : supprimer une œuvre mal reconstituée ne doit jamais
-- emporter les volumes — donc ni les bibliothèques, notes et avis qui en dépendent.
ALTER TABLE "Media" ADD CONSTRAINT "Media_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
