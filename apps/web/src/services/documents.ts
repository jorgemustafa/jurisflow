import { request, requestBlob, searchParams } from "src/services/http.js";

export type DocumentScope = "all" | "client" | "case";
export type LegalDocument = {
  id: string; clientId: string; caseId: string | null; name: string; originalName: string;
  mimeType: string; sizeBytes: number; clientName: string | null; caseTitle: string | null;
  createdAt: string; updatedAt: string;
};
export type DocumentFilters = { q?: string; scope?: DocumentScope; clientId?: string; caseId?: string };
export type DocumentFormData = { clientId: string; caseId: string; name: string; file: File | null };

export const listDocuments = (filters: DocumentFilters) => request<LegalDocument[]>(`/documents${searchParams(filters)}`);

export const createDocument = (data: DocumentFormData) => {
  const body = new FormData();
  body.set("clientId", data.clientId);
  if (data.caseId) body.set("caseId", data.caseId);
  body.set("name", data.name);
  if (data.file) body.set("file", data.file);
  return request<LegalDocument>("/documents", { method: "POST", body });
};

export const deleteDocument = (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" });

export async function openDocument(document: LegalDocument, download = false) {
  const preview = download ? null : window.open("", "_blank");
  try {
    const blob = await requestBlob(`/documents/${document.id}/content`);
    const url = URL.createObjectURL(blob);
    if (preview) preview.location.href = url;
    else {
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.originalName;
      anchor.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}
