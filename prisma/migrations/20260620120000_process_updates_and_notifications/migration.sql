-- Process update sync runs and notifications

CREATE TYPE "CaseSyncTrigger" AS ENUM ('MANUAL', 'SCHEDULED');
CREATE TYPE "CaseSyncStatus" AS ENUM ('SUCCESS', 'NO_CHANGES', 'FAILED');

ALTER TABLE "Case" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

CREATE TABLE "CaseSyncRun" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "triggeredByUserId" TEXT,
    "trigger" "CaseSyncTrigger" NOT NULL,
    "status" "CaseSyncStatus" NOT NULL,
    "newMovements" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "CaseSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "newMovements" INTEGER NOT NULL DEFAULT 0,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaseSyncRun_caseId_startedAt_idx" ON "CaseSyncRun"("caseId", "startedAt");
CREATE INDEX "CaseSyncRun_trigger_startedAt_idx" ON "CaseSyncRun"("trigger", "startedAt");

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_caseId_idx" ON "Notification"("caseId");

ALTER TABLE "CaseSyncRun" ADD CONSTRAINT "CaseSyncRun_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseSyncRun" ADD CONSTRAINT "CaseSyncRun_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
