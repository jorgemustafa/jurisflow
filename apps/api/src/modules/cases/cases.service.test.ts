import { describe, expect, it } from "vitest";
import type { CaseListFilters, CreateCaseInput, UpdateCaseInput } from "./cases.schemas.js";
import {
  CaseClientError,
  CasePendingFinanceError,
  CaseResponsibleUserError,
  createCasesService,
  type CaseRecord
} from "./cases.service.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function caseRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case-1",
    clientId: "client-1",
    responsibleUserId: null,
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
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRepository(options: { inactiveClient?: boolean; assistantUser?: boolean; pendingFinance?: boolean } = {}) {
  const cases: CaseRecord[] = [];

  return {
    async list(_filters: CaseListFilters) {
      return cases;
    },
    async findById(id: string) {
      return cases.find((item) => item.id === id) ?? null;
    },
    async findClientById(id: string) {
      if (id !== "client-1") return null;
      return { id, status: options.inactiveClient ? "inactive" : "active" } as const;
    },
    async findUserById(id: string) {
      if (id !== "user-1") return null;
      return { id, status: "active", role: options.assistantUser ? "assistant" : "lawyer" } as const;
    },
    async findByCnjNumber(cnjNumber: string, excludeId?: string) {
      return cases.find((item) => item.cnjNumber === cnjNumber && item.id !== excludeId) ?? null;
    },
    async hasPendingFinance(_caseId: string) {
      return options.pendingFinance ?? false;
    },
    async create(data: CreateCaseInput) {
      const item = caseRecord({
        id: `case-${cases.length + 1}`,
        clientId: data.clientId,
        responsibleUserId: data.responsibleUserId ?? null,
        caseType: data.caseType ?? "judicial",
        title: data.title,
        cnjNumber: data.cnjNumber ?? null,
        status: data.status ?? "active",
        stage: data.stage ?? null,
        legalArea: data.legalArea ?? null
      });
      cases.push(item);
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
    }
  };
}

describe("cases service", () => {
  it("creates a judicial case with only client and title", async () => {
    const repository = createRepository();
    const service = createCasesService(repository);

    const item = await service.create({ clientId: "client-1", caseType: "judicial", title: "Ação penal", status: "active" });

    expect(item).toMatchObject({
      clientId: "client-1",
      caseType: "judicial",
      title: "Ação penal",
      status: "active"
    });
  });

  it("blocks creating a case for inactive clients", async () => {
    const service = createCasesService(createRepository({ inactiveClient: true }));

    await expect(service.create({ clientId: "client-1", caseType: "judicial", title: "Caso", status: "active" })).rejects.toBeInstanceOf(
      CaseClientError
    );
  });

  it("requires the responsible user to be a lawyer or admin", async () => {
    const service = createCasesService(createRepository({ assistantUser: true }));

    await expect(
      service.create({
        clientId: "client-1",
        responsibleUserId: "user-1",
        caseType: "judicial",
        title: "Caso",
        status: "active"
      })
    ).rejects.toBeInstanceOf(CaseResponsibleUserError);
  });

  it("blocks closing a case with pending finance", async () => {
    const repository = createRepository({ pendingFinance: true });
    repository.seed(caseRecord());
    const service = createCasesService(repository);

    await expect(service.update("case-1", { status: "closed" })).rejects.toBeInstanceOf(CasePendingFinanceError);
  });
});
