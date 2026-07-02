/*
  Warnings:

  - You are about to drop the column `createdAt` on the `CaseImportItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CaseImportItem` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CaseImportItem_batchId_cnjNumber_key";

-- DropIndex
DROP INDEX "CaseImportItem_batchId_status_idx";

-- AlterTable
ALTER TABLE "CaseImportItem" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- CreateIndex
CREATE INDEX "CaseImportItem_batchId_idx" ON "CaseImportItem"("batchId");

-- CreateIndex
CREATE INDEX "CaseImportItem_status_idx" ON "CaseImportItem"("status");

-- CreateIndex
CREATE INDEX "CaseImportItem_cnjNumber_idx" ON "CaseImportItem"("cnjNumber");
