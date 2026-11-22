-- ImportState records the content hash each Cargo table was last imported from,
-- so the Railway pre-deploy import can skip unchanged tables. Empty on first
-- deploy, which means one full (idempotent) import.

CREATE TABLE "ImportState" (
    "table" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "lastImported" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportState_pkey" PRIMARY KEY ("table")
);
