-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('GENERATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'BOLETO', 'OTHER');

-- ReplaceEnum
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID', 'CANCELED');
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING (
  CASE
    WHEN "status"::text = 'OVERDUE' THEN 'PENDING'
    ELSE "status"::text
  END
)::"PaymentStatus_new";
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Case" ADD COLUMN "totalFeeAmountCents" INTEGER;

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "paymentScheduleId" TEXT,
ADD COLUMN "source" "PaymentSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "installmentNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "installmentTotal" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "notes" TEXT,
ADD COLUMN "canceledAt" TIMESTAMP(3),
ADD COLUMN "cancelReason" TEXT;

-- CreateIndex
CREATE INDEX "Payment_clientId_idx" ON "Payment"("clientId");

-- CreateIndex
CREATE INDEX "Payment_caseId_idx" ON "Payment"("caseId");

-- CreateIndex
CREATE INDEX "Payment_paymentScheduleId_idx" ON "Payment"("paymentScheduleId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");
