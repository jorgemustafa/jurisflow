import { describe, expect, it } from "vitest";
import type {
  CaseListFilters,
  UpdateCaseInput,
} from "../../modules/cases/cases.schemas.js";
import type { CreatePaymentData } from "../../modules/payments/payments.service.js";
import {
  CaseClientError,
  CasePendingFinanceError,
  CaseResponsibleUserError,
  createCasesService,
  type CaseRecord,
  type CreateCaseRecordData,
} from "../../modules/cases/cases.service.js";

const now = new Date("2026-06-05T12:00:00.000Z");
const finance = {
  totalFeeAmountCents: 150000,
  entryAmountCents: 20000,
  installmentAmountCents: 50000,
  firstDueDate: "2026-07-10",
  entryPaymentMethod: "pix" as const,
};

function caseRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case-1",
    clientId: "client-1",
    clientName: null,
    responsibleUserId: null,
    responsibleUserName: null,
    caseType: "judicial",
    title: "Ação penal",
    cnjNumber: null,
    status: "active",
    stage: null,
    legalArea: null,
    opposingParty: null,
    court: null,
    jurisdiction: null,
    division: null,
    description: null,
    openedAt: null,
    closedAt: null,
    totalFeeAmountCents: 150000,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createRepository(
  options: {
    inactiveClient?: boolean;
    assistantUser?: boolean;
    pendingFinance?: boolean;
  } = {},
) {
  const cases: CaseRecord[] = [];
  const payments: CreatePaymentData[] = [];

  return {
    payments,
    async list(_filters: CaseListFilters) {
      return cases;
    },
    async findById(id: string) {
      return cases.find((item) => item.id === id) ?? null;
    },
    async findClientById(id: string) {
      if (id !== "client-1") return null;
      return {
        id,
        status: options.inactiveClient ? "inactive" : "active",
      } as const;
    },
    async findUserById(id: string) {
      if (id !== "user-1") return null;
      return {
        id,
        status: "active",
        role: options.assistantUser ? "assistant" : "lawyer",
      } as const;
    },
    async findByCnjNumber(cnjNumber: string, excludeId?: string) {
      return (
        cases.find(
          (item) => item.cnjNumber === cnjNumber && item.id !== excludeId,
        ) ?? null
      );
    },
    async hasPendingFinance(_caseId: string) {
      return options.pendingFinance ?? false;
    },
    async create(
      data: CreateCaseRecordData,
      createdPayments: CreatePaymentData[],
    ) {
      const item = caseRecord({
        id: data.id,
        clientId: data.clientId,
        responsibleUserId: data.responsibleUserId ?? null,
        caseType: data.caseType ?? "judicial",
        title: data.title,
        cnjNumber: data.cnjNumber ?? null,
        status: data.status ?? "active",
        stage: data.stage ?? null,
        legalArea: data.legalArea ?? null,
        totalFeeAmountCents: data.totalFeeAmountCents,
        createdAt: data.createdAt,
      });
      cases.push(item);
      payments.push(...createdPayments);
      return item;
    },
    async update(id: string, data: UpdateCaseInput) {
      const item = cases.find((current) => current.id === id);
      if (!item) throw new Error("test setup error");
      Object.assign(item, data, { updatedAt: now });
      return item;
    },
    seed(item: CaseRecord) {
      cases.push(item);
    },
  };
}

describe("cases service", () => {
  it("creates a case atomically with its paid entry and fixed installments", async () => {
    const repository = createRepository();
    const service = createCasesService(repository, { now: () => now });

    const item = await service.create({
      clientId: "client-1",
      caseType: "judicial",
      title: "Ação penal",
      status: "active",
      finance,
    });

    expect(item).toMatchObject({
      clientId: "client-1",
      caseType: "judicial",
      title: "Ação penal",
      status: "active",
    });
    expect(
      repository.payments.map((payment) => payment.installmentNumber),
    ).toEqual([0, 1, 2, 3]);
    expect(repository.payments[0]).toMatchObject({
      status: "paid",
      amountCents: 20000,
    });
  });

  it("blocks creating a case for inactive clients", async () => {
    const service = createCasesService(
      createRepository({ inactiveClient: true }),
      { now: () => now },
    );

    await expect(
      service.create({
        clientId: "client-1",
        caseType: "judicial",
        title: "Caso",
        status: "active",
        finance,
      }),
    ).rejects.toBeInstanceOf(CaseClientError);
  });

  it("requires the responsible user to be a lawyer or admin", async () => {
    const service = createCasesService(
      createRepository({ assistantUser: true }),
      { now: () => now },
    );

    await expect(
      service.create({
        clientId: "client-1",
        responsibleUserId: "user-1",
        caseType: "judicial",
        title: "Caso",
        status: "active",
        finance,
      }),
    ).rejects.toBeInstanceOf(CaseResponsibleUserError);
  });

  it("blocks closing a case with pending finance", async () => {
    const repository = createRepository({ pendingFinance: true });
    repository.seed(caseRecord());
    const service = createCasesService(repository);

    await expect(
      service.update("case-1", { status: "closed" }),
    ).rejects.toBeInstanceOf(CasePendingFinanceError);
  });

  it("blocks changing the client bound to the financial agreement", async () => {
    const repository = createRepository();
    repository.seed(caseRecord());
    const service = createCasesService(repository);

    await expect(
      service.update("case-1", {
        clientId: "22222222-2222-4222-8222-222222222222",
      }),
    ).rejects.toBeInstanceOf(CaseClientError);
  });
});
