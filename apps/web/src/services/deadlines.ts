import { request, searchParams } from "src/services/http.js";

export type DeadlineStatus = "pending" | "done" | "canceled";
export type DeadlineAlertLevel = "overdue" | "due_soon" | "none";

export type CaseDeadline = {
  id: string;
  caseId: string;
  caseTitle: string | null;
  clientName: string | null;
  title: string;
  description: string | null;
  dueAt: string;
  status: DeadlineStatus;
  completedAt: string | null;
  alertLevel: DeadlineAlertLevel;
  createdAt: string;
  updatedAt: string;
};

export type DeadlineFilters = {
  q?: string;
  status?: DeadlineStatus | "all";
  caseId?: string;
  alertWindowDays?: string;
};

export type DeadlineFormData = {
  title: string;
  description: string;
  dueAt: string;
};

export const listDeadlines = (filters: DeadlineFilters) => {
  return request<CaseDeadline[]>(`/deadlines${searchParams(filters)}`);
};

export const createDeadline = (caseId: string, data: DeadlineFormData) => {
  return request<CaseDeadline>(`/cases/${caseId}/deadlines`, { method: "POST", body: JSON.stringify(data) });
};

export const updateDeadline = (id: string, data: DeadlineFormData) => {
  return request<CaseDeadline>(`/deadlines/${id}`, { method: "PATCH", body: JSON.stringify(data) });
};

export const updateDeadlineStatus = (id: string, status: DeadlineStatus) => {
  return request<CaseDeadline>(`/deadlines/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
};
