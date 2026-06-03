ALTER TABLE "CaseTimelineEvent"
ADD COLUMN "externalSource" TEXT,
ADD COLUMN "externalId" TEXT,
ADD COLUMN "sourceHash" TEXT;

CREATE UNIQUE INDEX "CaseTimelineEvent_caseId_sourceHash_key" ON "CaseTimelineEvent"("caseId", "sourceHash");
CREATE INDEX "CaseTimelineEvent_externalSource_idx" ON "CaseTimelineEvent"("externalSource");
