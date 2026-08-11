ALTER TABLE "CaseImportItem"
ADD CONSTRAINT "CaseImportItem_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CaseImportItem_clientId_idx" ON "CaseImportItem"("clientId");
