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
