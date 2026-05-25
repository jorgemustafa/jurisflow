-- CreateEnum
CREATE TYPE "CaseTimelineEventType" AS ENUM ('NOTE', 'HEARING', 'PETITION', 'DECISION', 'STATUS_CHANGE', 'OTHER');

-- CreateTable
CREATE TABLE "CaseTimelineEvent" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "type" "CaseTimelineEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CaseTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseTimelineEvent_caseId_occurredAt_idx" ON "CaseTimelineEvent"("caseId", "occurredAt");

-- CreateIndex
CREATE INDEX "CaseTimelineEvent_createdByUserId_idx" ON "CaseTimelineEvent"("createdByUserId");

-- CreateIndex
CREATE INDEX "CaseTimelineEvent_type_idx" ON "CaseTimelineEvent"("type");

-- AddForeignKey
ALTER TABLE "CaseTimelineEvent" ADD CONSTRAINT "CaseTimelineEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTimelineEvent" ADD CONSTRAINT "CaseTimelineEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
