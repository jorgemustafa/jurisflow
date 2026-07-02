ALTER TABLE "Case" ALTER COLUMN "totalFeeAmountCents" SET NOT NULL;
ALTER TABLE "CaseImportItem" ADD COLUMN "financeData" JSONB;
