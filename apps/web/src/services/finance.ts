import { request, searchParams } from "src/services/http.js";

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

export const getFinanceDashboard = (month: string) => {
  return request<FinanceDashboard>(`/finance/dashboard${searchParams({ month })}`);
};

export type PaymentStatus = "pending" | "paid" | "canceled";
export type PaymentMethod = "pix" | "cash" | "bank_transfer" | "credit_card" | "debit_card" | "boleto" | "other";

export type Payment = {
  id: string;
  clientId: string;
  caseId: string | null;
  source: "generated" | "manual";
  description: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  status: PaymentStatus;
  installmentNumber: number;
  installmentTotal: number;
  notes: string | null;
  clientName?: string;
  caseTitle?: string | null;
};

export type PaymentFilters = {
  month: string;
  status: PaymentStatus | "all";
};

export const listPayments = (filters: PaymentFilters) => {
  return request<Payment[]>(`/payments${searchParams(filters)}`);
};

export const markPaymentPaid = (id: string, data: { paidAt: string; paymentMethod: PaymentMethod }) => {
  return request<Payment>(`/payments/${id}/paid`, { method: "PATCH", body: JSON.stringify(data) });
};
