ALTER TABLE "Document" RENAME COLUMN "path" TO "storageKey";
ALTER TABLE "Document"
  ADD COLUMN "originalName" TEXT,
  ADD COLUMN "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "checksumSha256" VARCHAR(64) NOT NULL DEFAULT '',
  ADD COLUMN "uploadedByUserId" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "purgeAfter" TIMESTAMP(3);

UPDATE "Document" SET "originalName" = "name" WHERE "originalName" IS NULL;
ALTER TABLE "Document" ALTER COLUMN "originalName" SET NOT NULL;

CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");
CREATE INDEX "Document_purgeAfter_idx" ON "Document"("purgeAfter");
CREATE INDEX "Document_uploadedByUserId_idx" ON "Document"("uploadedByUserId");
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
