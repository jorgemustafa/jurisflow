-- CreateEnum
CREATE TYPE "CaseDeadlineStatus" AS ENUM ('PENDING', 'DONE', 'CANCELED');

-- CreateTable
CREATE TABLE "CaseDeadline" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" "CaseDeadlineStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CaseDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseDeadline_caseId_dueAt_idx" ON "CaseDeadline"("caseId", "dueAt");

-- CreateIndex
CREATE INDEX "CaseDeadline_status_dueAt_idx" ON "CaseDeadline"("status", "dueAt");

-- AddForeignKey
ALTER TABLE "CaseDeadline" ADD CONSTRAINT "CaseDeadline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
