import type { CaseFinanceInput } from "@jurisflow/shared";
import { request, searchParams } from "src/services/http.js";

export type CaseType = "judicial" | "extrajudicial";
export type CaseStatus = "active" | "on_hold" | "closed" | "canceled";
export type CaseStage =
  | "initial"
  | "hearing_scheduled"
  | "waiting_decision"
  | "appeal"
  | "enforcement";
export type LegalArea =
  | "civil"
  | "labor"
  | "family"
  | "criminal"
  | "tax"
  | "consumer"
  | "business"
  | "social_security"
  | "other";
export type CaseTimelineEventType =
  | "note"
  | "hearing"
  | "petition"
  | "decision"
  | "status_change"
  | "other";

export type LegalCase = {
  id: string;
  clientId: string;
  responsibleUserId: string | null;
  caseType: CaseType;
  title: string;
  cnjNumber: string | null;
  status: CaseStatus;
  stage: CaseStage | null;
  legalArea: LegalArea | null;
  opposingParty: string | null;
  court: string | null;
  jurisdiction: string | null;
  division: string | null;
  description: string | null;
  openedAt: string | null;
  closedAt: string | null;
  totalFeeAmountCents: number;
  createdAt: string;
  updatedAt: string;
};

export type CaseFilters = {
  q: string;
  status: string;
  caseType: string;
  stage: string;
  legalArea: string;
  clientId?: string;
};

export type TimelineFilters = {
  q: string;
  type: CaseTimelineEventType | "all";
};

export type CaseFormData = {
  clientId: string;
  caseType: CaseType;
  title: string;
  cnjNumber: string;
  status: CaseStatus;
  stage: CaseStage | "";
  legalArea: LegalArea | "";
  opposingParty: string;
  court: string;
  jurisdiction: string;
  division: string;
  description: string;
  openedAt: string;
  closedAt: string;
};

export type CreateCaseData = CaseFormData & { finance: CaseFinanceInput };

export type CaseTimelineEvent = {
  id: string;
  caseId: string;
  createdByUserId: string | null;
  createdByUserName: string | null;
  externalSource: string | null;
  externalId: string | null;
  sourceHash: string | null;
  caseTitle: string | null;
  clientName: string | null;
  type: CaseTimelineEventType;
  title: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CaseTimelineEventFormData = {
  type: CaseTimelineEventType;
  title: string;
  description: string;
  occurredAt: string;
};

export type ImportedMovement = {
  externalId: string;
  sourceHash: string;
  type: CaseTimelineEventType;
  title: string;
  description: string | null;
  occurredAt: string;
};

export type CaseImportDraft = {
  cnjNumber: string;
  title: string;
  court: string | null;
  jurisdiction: string | null;
  division: string | null;
  description: string | null;
  openedAt: string | null;
  movements: ImportedMovement[];
};

export type CaseImportPreview = {
  draft: CaseImportDraft | null;
  duplicate: LegalCase | null;
};

export type CaseImportResult = {
  case: LegalCase;
  importedMovements: number;
  skippedMovements: number;
};

export const listCases = (filters: CaseFilters) => {
  return request<LegalCase[]>(`/cases${searchParams(filters)}`);
};

export const getCase = (id: string) => {
  return request<LegalCase>(`/cases/${id}`);
};

export const createCase = (data: CreateCaseData) => {
  return request<LegalCase>("/cases", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateCase = (id: string, data: CaseFormData) => {
  return request<LegalCase>(`/cases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const listCaseTimeline = (caseId: string) => {
  return request<CaseTimelineEvent[]>(`/cases/${caseId}/timeline`);
};

export const createCaseTimelineEvent = (
  caseId: string,
  data: CaseTimelineEventFormData,
) => {
  return request<CaseTimelineEvent>(`/cases/${caseId}/timeline`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const listTimeline = (filters: TimelineFilters) => {
  return request<CaseTimelineEvent[]>(`/timeline${searchParams(filters)}`);
};

export type CaseImportBatchStatus = "open" | "completed";
export type CaseImportItemStatus =
  | "pending"
  | "duplicate"
  | "failed"
  | "imported"
  | "discarded";

export type CaseImportBatchItem = {
  id: string;
  batchId: string;
  cnjNumber: string;
  courtCode: string | null;
  status: CaseImportItemStatus;
  errorMessage: string | null;
  draft: CaseImportDraft | null;
  financeData: CaseFinanceInput | null;
  clientId: string | null;
  caseId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseImportBatch = {
  id: string;
  status: CaseImportBatchStatus;
  source: string;
  items: CaseImportBatchItem[];
  createdAt: string;
  updatedAt: string;
};

export type CaseImportBatchResult = {
  batch: CaseImportBatch;
  imported: number;
  duplicates: number;
  importedMovements: number;
};

export const createCaseImportBatch = (cnjNumbers: string[]) => {
  return request<CaseImportBatch>("/cases/import/batches", {
    method: "POST",
    body: JSON.stringify({ cnjNumbers }),
  });
};

export const getCaseImportBatch = (batchId: string) => {
  return request<CaseImportBatch>(`/cases/import/batches/${batchId}`);
};

export const updateCaseImportItem = (
  batchId: string,
  itemId: string,
  data: {
    clientId?: string | null;
    status?: "pending" | "discarded";
    finance?: CaseFinanceInput;
  },
) => {
  return request<CaseImportBatch>(
    `/cases/import/batches/${batchId}/items/${itemId}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
};

export const confirmCaseImportBatch = (batchId: string) => {
  return request<CaseImportBatchResult>(
    `/cases/import/batches/${batchId}/confirm`,
    { method: "POST" },
  );
};

export const previewCaseImport = (data: {
  cnjNumber: string;
  courtCode: string;
}) => {
  return request<CaseImportPreview>("/cases/import/preview", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const confirmCaseImport = (data: {
  cnjNumber: string;
  courtCode: string;
  clientId: string;
  finance: CaseFinanceInput;
}) => {
  return request<CaseImportResult>("/cases/import", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export type CaseSyncTrigger = "manual" | "scheduled";
export type CaseSyncStatus = "success" | "no_changes" | "failed";

export type CaseSyncResult = {
  caseId: string;
  status: CaseSyncStatus;
  newMovements: number;
  errorMessage: string | null;
};

export type CaseSyncBatchResult = {
  total: number;
  updated: number;
  unchanged: number;
  failed: number;
  newMovements: number;
};

export type CaseSyncRun = {
  id: string;
  caseId: string;
  triggeredByUserId: string | null;
  triggeredByUserName: string | null;
  trigger: CaseSyncTrigger;
  status: CaseSyncStatus;
  newMovements: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export const syncCase = (id: string) => {
  return request<CaseSyncResult>(`/cases/${id}/sync`, { method: "POST" });
};

export const syncAllCases = () => {
  return request<CaseSyncBatchResult>("/cases/sync", { method: "POST" });
};

export const listCaseSyncRuns = (id: string) => {
  return request<CaseSyncRun[]>(`/cases/${id}/sync-runs`);
};
