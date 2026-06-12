ALTER TABLE "User"
ADD COLUMN "oabNumber" VARCHAR(20),
ADD COLUMN "oabState" VARCHAR(2);

CREATE TYPE "CaseImportBatchStatus" AS ENUM ('OPEN', 'COMPLETED');
CREATE TYPE "CaseImportItemStatus" AS ENUM ('PENDING', 'DUPLICATE', 'FAILED', 'IMPORTED', 'DISCARDED');

CREATE TABLE "CaseImportBatch" (
    "id" TEXT NOT NULL,
    "status" "CaseImportBatchStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'datajud',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseImportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "cnjNumber" VARCHAR(20) NOT NULL,
    "courtCode" TEXT,
    "status" "CaseImportItemStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "draft" JSONB,
    "clientId" TEXT,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseImportItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaseImportBatch_status_createdAt_idx" ON "CaseImportBatch"("status", "createdAt");
CREATE UNIQUE INDEX "CaseImportItem_batchId_cnjNumber_key" ON "CaseImportItem"("batchId", "cnjNumber");
CREATE INDEX "CaseImportItem_batchId_status_idx" ON "CaseImportItem"("batchId", "status");

ALTER TABLE "CaseImportItem" ADD CONSTRAINT "CaseImportItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CaseImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
