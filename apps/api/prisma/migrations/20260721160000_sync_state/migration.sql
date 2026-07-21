-- État d'exécution des tâches périodiques (ADR-0019).
-- Migration ADDITIVE : une table isolée, aucune donnée existante touchée.

CREATE TABLE "SyncState" (
    "job" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" TEXT,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("job")
);
