-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('JUDICIAL', 'EXTRAJUDICIAL');

-- CreateEnum
CREATE TYPE "CaseStage" AS ENUM ('INITIAL', 'HEARING_SCHEDULED', 'WAITING_DECISION', 'APPEAL', 'ENFORCEMENT');

-- CreateEnum
CREATE TYPE "LegalArea" AS ENUM ('CIVIL', 'LABOR', 'FAMILY', 'CRIMINAL', 'TAX', 'CONSUMER', 'BUSINESS', 'SOCIAL_SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'LAWYER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- ReplaceEnum
CREATE TYPE "CaseStatus_new" AS ENUM ('ACTIVE', 'ON_HOLD', 'CLOSED', 'CANCELED');
ALTER TABLE "Case" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Case" ALTER COLUMN "status" TYPE "CaseStatus_new" USING (
  CASE
    WHEN "status"::text = 'SUSPENDED' THEN 'ON_HOLD'
    ELSE "status"::text
  END
)::"CaseStatus_new";
ALTER TYPE "CaseStatus" RENAME TO "CaseStatus_old";
ALTER TYPE "CaseStatus_new" RENAME TO "CaseStatus";
DROP TYPE "CaseStatus_old";
ALTER TABLE "Case" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "type" "ClientType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "address" TEXT,
ADD COLUMN "notes" TEXT;

ALTER TABLE "Client" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Client" ALTER COLUMN "document" TYPE VARCHAR(14);
ALTER TABLE "Client" ALTER COLUMN "phone" TYPE VARCHAR(11);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'LAWYER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Case"
ADD COLUMN "responsibleUserId" TEXT,
ADD COLUMN "caseType" "CaseType" NOT NULL DEFAULT 'JUDICIAL',
ADD COLUMN "stage" "CaseStage",
ADD COLUMN "legalArea" "LegalArea",
ADD COLUMN "opposingParty" TEXT,
ADD COLUMN "court" TEXT,
ADD COLUMN "jurisdiction" TEXT,
ADD COLUMN "division" TEXT,
ADD COLUMN "openedAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "caseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "Client"("type");

-- CreateIndex
CREATE INDEX "Client_status_type_idx" ON "Client"("status", "type");

-- CreateIndex
CREATE INDEX "Case_clientId_idx" ON "Case"("clientId");

-- CreateIndex
CREATE INDEX "Case_responsibleUserId_idx" ON "Case"("responsibleUserId");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_caseType_idx" ON "Case"("caseType");

-- CreateIndex
CREATE INDEX "Case_stage_idx" ON "Case"("stage");

-- CreateIndex
CREATE INDEX "Case_legalArea_idx" ON "Case"("legalArea");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
