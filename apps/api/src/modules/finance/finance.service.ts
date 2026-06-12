import type { FinanceDashboardFilters } from "./finance.schemas.js";

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

export type FinancePaymentSummary = {
  id: string;
  clientName: string;
  caseTitle: string | null;
  description: string;
  amountCents: number;
  dueDate: Date;
  installmentNumber: number;
  installmentTotal: number;
};

type FinanceRepository = {
  dashboard(month: string): Promise<FinanceDashboard>;
};

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function createFinanceService(repository: FinanceRepository) {
  return {
    dashboard(filters: FinanceDashboardFilters) {
