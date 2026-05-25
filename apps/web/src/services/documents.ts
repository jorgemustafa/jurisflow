import { request, searchParams } from "src/services/http.js";

export type DocumentScope = "all" | "client" | "case";

export type LegalDocument = {
  id: string;
  clientId: string;
  caseId: string | null;
  name: string;
  path: string;
  mimeType: string;
  clientName: string | null;
  caseTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentFilters = {
  q?: string;
  scope?: DocumentScope;
  clientId?: string;
  caseId?: string;
};

export type DocumentFormData = {
  clientId: string;
  caseId: string;
  name: string;
  path: string;
  mimeType: string;
};

export const listDocuments = (filters: DocumentFilters) => {
  return request<LegalDocument[]>(`/documents${searchParams(filters)}`);
};

export const createDocument = (data: DocumentFormData) => {
  return request<LegalDocument>("/documents", { method: "POST", body: JSON.stringify(data) });
};
