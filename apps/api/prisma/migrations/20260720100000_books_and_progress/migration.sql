-- Ajout du type de média « livre » et de la progression générique (ADR-0017).
-- Migration strictement ADDITIVE : aucune colonne existante n'est modifiée ou supprimée,
-- les données films/séries sont inchangées.

-- AlterEnum
-- La valeur est seulement ajoutée ici ; elle n'est utilisée qu'après commit (contrainte
-- PostgreSQL sur ALTER TYPE ... ADD VALUE dans une transaction).
ALTER TYPE "MediaType" ADD VALUE 'BOOK';

-- CreateEnum
CREATE TYPE "ProgressUnit" AS ENUM ('PAGES', 'PERCENT');

-- AlterTable
ALTER TABLE "LibraryItem" ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "progressUnit" "ProgressUnit",
ADD COLUMN     "progressValue" INTEGER,
ADD COLUMN     "progressTotal" INTEGER;

-- CreateTable
CREATE TABLE "BookMetadata" (
    "mediaId" TEXT NOT NULL,
    "subtitle" TEXT,
    "authors" TEXT[],
    "description" TEXT,
    "pageCount" INTEGER,
    "publisher" TEXT,
    "publishedDate" TEXT,
    "language" TEXT,
    "categories" TEXT[],
    "isbn10" TEXT,
    "isbn13" TEXT,
    "googleBooksId" TEXT,
    "openLibraryId" TEXT,
    "infoUrl" TEXT,
    "previewUrl" TEXT,
    "averageRating" DOUBLE PRECISION,
    "ratingsCount" INTEGER,
    "coverUrlLarge" TEXT,
    "sources" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookMetadata_pkey" PRIMARY KEY ("mediaId")
);

-- CreateTable
CREATE TABLE "ProgressEntry" (
    "id" TEXT NOT NULL,
    "libraryItemId" TEXT NOT NULL,
    "unit" "ProgressUnit" NOT NULL,
    "fromValue" INTEGER NOT NULL,
    "toValue" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookMetadata_isbn13_idx" ON "BookMetadata"("isbn13");

-- CreateIndex
CREATE INDEX "BookMetadata_googleBooksId_idx" ON "BookMetadata"("googleBooksId");

-- CreateIndex
CREATE INDEX "BookMetadata_openLibraryId_idx" ON "BookMetadata"("openLibraryId");

-- CreateIndex
CREATE INDEX "ProgressEntry_libraryItemId_occurredAt_idx" ON "ProgressEntry"("libraryItemId", "occurredAt");

-- AddForeignKey
ALTER TABLE "BookMetadata" ADD CONSTRAINT "BookMetadata_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEntry" ADD CONSTRAINT "ProgressEntry_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
