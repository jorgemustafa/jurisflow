import { describe, expect, it } from "vitest";
import type { ImportedCaseDraft } from "../../modules/cases/case-import.service.js";
import {
  CaseImportClientError,
  CaseImportDuplicateError,
  createCaseImportService,
  type ImportedMovement
} from "../../modules/cases/case-import.service.js";
import type { CaseRecord } from "../../modules/cases/cases.service.js";

const now = new Date("2026-01-01T00:00:00.000Z");
const cnjNumber = "00000012320268260000";

function caseRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case-1",
    clientId: "client-1",
    responsibleUserId: null,
    caseType: "judicial",
    title: "Ação penal",
    cnjNumber,
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
    totalFeeAmountCents: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

const movement = (overrides: Partial<ImportedMovement> = {}): ImportedMovement => ({
  externalId: "1-2026-01-01T00:00:00.000Z",
  sourceHash: "hash-1",
  type: "other",
  title: "Conclusos para decisão",
  description: null,
  occurredAt: now,
  ...overrides
});

const draft = (movements: ImportedMovement[] = [movement()]): ImportedCaseDraft => ({
  cnjNumber,
  title: `Procedimento - ${cnjNumber}`,
  court: "TJSP",
  jurisdiction: null,
  division: "1 Vara",
  description: "Assunto",
  openedAt: now,
  movements
});

function createRepository(options: { duplicate?: boolean; inactiveClient?: boolean } = {}) {
  return {
    importedMovements: [] as ImportedMovement[],
    async findClientById(id: string) {
      if (id !== "client-1") return null;
      return { id, status: options.inactiveClient ? "inactive" : "active" } as const;
    },
    async findByCnjNumber() {
      return options.duplicate ? caseRecord() : null;
    },
    async importCase(clientId: string, item: ImportedCaseDraft) {
      this.importedMovements = item.movements;
      return { case: caseRecord({ clientId, title: item.title }), importedMovements: item.movements.length, skippedMovements: 0 };
    }
  };
}

describe("case import service", () => {
  it("returns duplicate data on preview without fetching DataJud", async () => {
    const repository = createRepository({ duplicate: true });
    let fetched = false;
    const service = createCaseImportService(repository, {
      async fetchCase() {
        fetched = true;
        return draft();
      }
    });

    const preview = await service.preview({ cnjNumber, courtCode: "tjsp" });

    expect(preview.duplicate).toMatchObject({ id: "case-1", cnjNumber });
    expect(preview.draft).toBeNull();
    expect(fetched).toBe(false);
  });

  it("blocks confirming a duplicated CNJ", async () => {
    const service = createCaseImportService(createRepository({ duplicate: true }), {
      async fetchCase() {
        return draft();
      }
    });

    await expect(service.confirm({ clientId: "client-1", cnjNumber, courtCode: "tjsp" })).rejects.toBeInstanceOf(CaseImportDuplicateError);
  });

  it("blocks importing into inactive clients", async () => {
    const service = createCaseImportService(createRepository({ inactiveClient: true }), {
      async fetchCase() {
        return draft();
      }
    });

    await expect(service.confirm({ clientId: "client-1", cnjNumber, courtCode: "tjsp" })).rejects.toBeInstanceOf(CaseImportClientError);
  });

  it("deduplicates imported movements by source hash", async () => {
    const repository = createRepository();
    const service = createCaseImportService(repository, {
      async fetchCase() {
        return draft([movement(), movement({ externalId: "same-content" }), movement({ sourceHash: "hash-2" })]);
      }
    });

    await service.confirm({ clientId: "client-1", cnjNumber, courtCode: "tjsp" });

    expect(repository.importedMovements.map((item) => item.sourceHash)).toEqual(["hash-1", "hash-2"]);
  });
});
