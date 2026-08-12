ALTER TABLE "Case" DROP CONSTRAINT "Case_clientId_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_clientId_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_caseId_fkey";
ALTER TABLE "Document" DROP CONSTRAINT "Document_clientId_fkey";
ALTER TABLE "Document" DROP CONSTRAINT "Document_caseId_fkey";
ALTER TABLE "CaseDeadline" DROP CONSTRAINT "CaseDeadline_caseId_fkey";
ALTER TABLE "CaseTimelineEvent" DROP CONSTRAINT "CaseTimelineEvent_caseId_fkey";
ALTER TABLE "CaseSyncRun" DROP CONSTRAINT "CaseSyncRun_caseId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_caseId_fkey";

ALTER TABLE "Case" ADD CONSTRAINT "Case_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseDeadline" ADD CONSTRAINT "CaseDeadline_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseTimelineEvent" ADD CONSTRAINT "CaseTimelineEvent_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseSyncRun" ADD CONSTRAINT "CaseSyncRun_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
