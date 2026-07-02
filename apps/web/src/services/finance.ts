import type { PaymentMethod } from "@magistrum/shared";
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
  monthPaidCents: number;
  monthOpenCents: number;
  monthOverdueCents: number;
  activeClients: number;
  runningCases: number;
  overduePayments: FinancePaymentSummary[];
  upcomingPayments: FinancePaymentSummary[];
};

export const getFinanceDashboard = (month: string) => {
  return request<FinanceDashboard>(
    `/finance/dashboard${searchParams({ month })}`,
  );
};

export type PaymentStatus = "pending" | "paid" | "canceled";
export type { PaymentMethod };

export type Payment = {
  id: string;
  clientId: string;
  caseId: string | null;
  paymentScheduleId: string | null;
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
  cancelReason?: string | null;
  clientName?: string;
  caseTitle?: string | null;
  caseTotalFeeAmountCents?: number | null;
};

export type PaymentFilters = {
  month?: string;
  status: PaymentStatus | "all";
  caseId?: string;
};

export const listPayments = (filters: PaymentFilters) => {
  return request<Payment[]>(
    `/payments${searchParams({ month: filters.month ?? "", status: filters.status, caseId: filters.caseId ?? "" })}`,
  );
};

export const markPaymentPaid = (
  id: string,
  data: { paidAt: string; paymentMethod: PaymentMethod },
) => {
  return request<Payment>(`/payments/${id}/paid`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export type CreatePaymentData = {
  clientId: string;
  caseId?: string;
  description: string;
  amountCents: number;
  dueDate: string;
  notes?: string;
};

export type UpdatePaymentData = {
  amountCents?: number;
  dueDate?: string;
  paidAt?: string;
  description?: string;
  notes?: string | null;
};

export const createPayment = (data: CreatePaymentData) => {
  return request<Payment>("/payments", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updatePayment = (id: string, data: UpdatePaymentData) => {
  return request<Payment>(`/payments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const cancelPayment = (id: string, data: { cancelReason: string }) => {
  return request<Payment>(`/payments/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};
