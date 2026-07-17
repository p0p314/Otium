-- CreateTable
CREATE TABLE "EpisodeReview" (
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "rating" INTEGER,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpisodeReview_pkey" PRIMARY KEY ("userId","episodeId")
);

-- AddForeignKey
ALTER TABLE "EpisodeReview" ADD CONSTRAINT "EpisodeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeReview" ADD CONSTRAINT "EpisodeReview_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
