export type ClientType = "individual" | "company";
export type ClientStatus = "active" | "inactive";

export type Client = {
  id: string;
  type: ClientType;
  status: ClientStatus;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientFormData = {
  type: ClientType;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

export type FinancePaymentSummary = {
  id: string;
  clientName: string;
  caseTitle: string | null;
  description: string;
  amountCents: number;
  dueDate: string;
  installmentNumber: number;
  installmentTotal: number;
};

export type FinanceDashboard = {
  month: string;
  receivedInMonthCents: number;
  dueInMonthCents: number;
  totalToReceiveCents: number;
  overdueAmountCents: number;
  activeClients: number;
  runningCases: number;
  overduePayments: FinancePaymentSummary[];
  upcomingPayments: FinancePaymentSummary[];
};

export class ApiError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const fieldErrors: Record<string, string> = {};

    if (Array.isArray(body?.issues)) {
      for (const issue of body.issues) {
        const field = issue.path?.[0];
        if (field) fieldErrors[field] = issue.message;
      }
    }

    if (body?.field) fieldErrors[body.field] = body.message;
    throw new ApiError(body?.message ?? "Erro inesperado", fieldErrors);
  }

  return response.json() as Promise<T>;
}

function searchParams(filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listClients(filters: { q: string; status: string; type: string }) {
  return request<Client[]>(`/clients${searchParams(filters)}`);
}

export function getClient(id: string) {
  return request<Client>(`/clients/${id}`);
}

export function createClient(data: ClientFormData) {
  return request<Client>("/clients", { method: "POST", body: JSON.stringify(data) });
}

export function updateClient(id: string, data: ClientFormData) {
  return request<Client>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function updateClientStatus(id: string, status: ClientStatus) {
  return request<Client>(`/clients/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function getFinanceDashboard(month: string) {
  return request<FinanceDashboard>(`/finance/dashboard${searchParams({ month })}`);
}
