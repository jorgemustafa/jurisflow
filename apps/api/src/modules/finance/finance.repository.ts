import { prisma } from "../../shared/db/prisma.js";
import type { FinanceDashboard, FinancePaymentSummary } from "./finance.service.js";

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

async function sumPayments(where: Parameters<typeof prisma.payment.aggregate>[0]["where"]) {
  const result = await prisma.payment.aggregate({ where, _sum: { amountCents: true } });
  return result._sum.amountCents ?? 0;
}

function toPaymentSummary(payment: {
  id: string;
  description: string;
  amountCents: number;
  dueDate: Date;
  installmentNumber: number;
  installmentTotal: number;
  client: { name: string };
  case: { title: string } | null;
}): FinancePaymentSummary {
  return {
    id: payment.id,
    clientName: payment.client.name,
    caseTitle: payment.case?.title ?? null,
    description: payment.description,
    amountCents: payment.amountCents,
    dueDate: payment.dueDate,
    installmentNumber: payment.installmentNumber,
    installmentTotal: payment.installmentTotal
  };
}

export const financeRepository = {
  async dashboard(month: string): Promise<FinanceDashboard> {
    const { start, end } = monthRange(month);
    const now = new Date();

    const [receivedInMonthCents, dueInMonthCents, totalToReceiveCents, overdueAmountCents, activeClients, runningCases, overdue, upcoming] =
      await Promise.all([
        sumPayments({ status: "PAID", paidAt: { gte: start, lt: end } }),
        sumPayments({ status: "PENDING", dueDate: { gte: start, lt: end } }),
        sumPayments({ status: "PENDING" }),
        sumPayments({ status: "PENDING", dueDate: { lt: now } }),
        prisma.client.count({ where: { status: "ACTIVE" } }),
        prisma.case.count({ where: { status: { in: ["ACTIVE", "ON_HOLD"] } } }),
        prisma.payment.findMany({
          where: { status: "PENDING", dueDate: { lt: now } },
          include: { client: { select: { name: true } }, case: { select: { title: true } } },
          orderBy: { dueDate: "asc" },
          take: 10
        }),
        prisma.payment.findMany({
          where: { status: "PENDING", dueDate: { gte: start, lt: end } },
          include: { client: { select: { name: true } }, case: { select: { title: true } } },
          orderBy: { dueDate: "asc" },
          take: 10
        })
      ]);

    return {
      month,
      receivedInMonthCents,
      dueInMonthCents,
      totalToReceiveCents,
      overdueAmountCents,
      activeClients,
      runningCases,
      overduePayments: overdue.map(toPaymentSummary),
      upcomingPayments: upcoming.map(toPaymentSummary)
    };
  }
};
