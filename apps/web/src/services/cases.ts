import { request, searchParams } from "src/services/http.js";

export type CaseType = "judicial" | "extrajudicial";
export type CaseStatus = "active" | "on_hold" | "closed" | "canceled";
export type CaseStage = "initial" | "hearing_scheduled" | "waiting_decision" | "appeal" | "enforcement";
export type LegalArea = "civil" | "labor" | "family" | "criminal" | "tax" | "consumer" | "business" | "social_security" | "other";

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
  totalFeeAmountCents: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseFilters = {
  q: string;
  status: string;
  caseType: string;
  stage: string;
  legalArea: string;
};

export const listCases = (filters: CaseFilters) => {
  return request<LegalCase[]>(`/cases${searchParams(filters)}`);
};
