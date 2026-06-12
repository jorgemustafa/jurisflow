import { describe, expect, it } from "vitest";
import {
  CaseImportBatchEmptyError,
  CaseImportBatchStateError,
  CaseImportItemStateError,
  createCaseImportBatchService,
  serializeDraft,
  type CaseImportBatchRecord,
  type CaseImportItemRecord,
  type NewCaseImportItem
} from "./case-import-batch.service.js";
import { CaseImportClientError, type ImportedCaseDraft, type ImportedMovement } from "./case-import.service.js";
import { DataJudCaseNotFoundError } from "./datajud.client.js";
import type { CaseRecord } from "./cases.service.js";

const now = new Date("2026-06-01T00:00:00.000Z");
const cnjTjsp = "00000012320268260000";
const cnjTjrj = "00000019920268190000";

function caseRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case-1",
    clientId: "client-1",
    responsibleUserId: null,
    caseType: "judicial",
    title: "Ação",
    cnjNumber: cnjTjsp,
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
  externalId: "1",
  sourceHash: "hash-1",
  type: "other",
  title: "Conclusos",
  description: null,
  occurredAt: now,
  ...overrides
});

const draft = (cnjNumber: string, movements: ImportedMovement[] = [movement()]): ImportedCaseDraft => ({
  cnjNumber,
  title: `Procedimento - ${cnjNumber}`,
  court: "TJSP",
  jurisdiction: null,
  division: null,
  description: null,
  openedAt: now,
  movements
});

type RepoOptions = {
  existingCnjNumbers?: string[];
  inactiveClient?: boolean;
};

function createRepository(options: RepoOptions = {}) {
  let itemSeq = 0;
  const batches: CaseImportBatchRecord[] = [];

  return {
    batches,
    importedItemIds: [] as string[],

    async findByCnjNumber(cnjNumber: string) {
      return options.existingCnjNumbers?.includes(cnjNumber) ? caseRecord({ cnjNumber }) : null;
    },

    async findClientById(id: string) {
      if (id !== "client-1") return null;
      return { id, status: options.inactiveClient ? "inactive" : "active" } as const;
    },

    async createBatch(items: NewCaseImportItem[]) {
      const batch: CaseImportBatchRecord = {
        id: `batch-${batches.length + 1}`,
        status: "open",
        source: "datajud",
        items: items.map((item) => {
          itemSeq += 1;
          return {
            ...item,
            id: `item-${itemSeq}`,
            batchId: `batch-${batches.length + 1}`,
            clientId: null,
            createdAt: now,
            updatedAt: now
          } satisfies CaseImportItemRecord;
        }),
        createdAt: now,
        updatedAt: now
      };
      batches.push(batch);
      return batch;
    },

    async listBatches(limit: number) {
      return batches.slice(0, limit);
    },

    async findBatchById(id: string) {
      return batches.find((batch) => batch.id === id) ?? null;
    },

    async updateItem(itemId: string, data: Partial<Pick<CaseImportItemRecord, "status" | "clientId" | "caseId" | "errorMessage">>) {
      for (const batch of batches) {
        const item = batch.items.find((entry) => entry.id === itemId);
        if (item) Object.assign(item, data);
      }
    },

    async importItem(itemId: string, clientId: string, imported: ImportedCaseDraft) {
      this.importedItemIds.push(itemId);
      await this.updateItem(itemId, { status: "imported", clientId, caseId: `case-for-${itemId}` });
      return { caseId: `case-for-${itemId}`, importedMovements: imported.movements.length, skippedMovements: 0 };
    },

    async setBatchStatus(batchId: string, status: CaseImportBatchRecord["status"]) {
      const batch = batches.find((entry) => entry.id === batchId);
      if (batch) batch.status = status;
    }
  };
}

const workingProvider = {
  async fetchCase(input: { cnjNumber: string; courtCode: string }) {
    return draft(input.cnjNumber);
  }
};

describe("case import batch service", () => {
  it("creates a batch deriving the court from the CNJ number", async () => {
    const repository = createRepository();
    const fetchedCourts: string[] = [];
    const service = createCaseImportBatchService(repository, {
      async fetchCase(input) {
        fetchedCourts.push(input.courtCode);
        return draft(input.cnjNumber);
      }
    });

    const batch = await service.create({ cnjNumbers: [cnjTjsp, cnjTjrj] });

    expect(fetchedCourts.sort()).toEqual(["tjrj", "tjsp"]);
    expect(batch.items).toHaveLength(2);
    expect(batch.items.every((item) => item.status === "pending" && item.draft)).toBe(true);
  });

  it("marks duplicates and unsupported numbers without fetching", async () => {
    const repository = createRepository({ existingCnjNumbers: [cnjTjsp] });
    let fetched = 0;
    const service = createCaseImportBatchService(repository, {
      async fetchCase() {
        fetched += 1;
        return draft(cnjTjrj);
      }
    });

    const batch = await service.create({ cnjNumbers: [cnjTjsp, "00000012320261000000"] });

    const duplicate = batch.items.find((item) => item.cnjNumber === cnjTjsp);
    const unsupported = batch.items.find((item) => item.cnjNumber === "00000012320261000000");
    expect(duplicate?.status).toBe("duplicate");
    expect(duplicate?.caseId).toBe("case-1");
    expect(unsupported?.status).toBe("failed");
    expect(fetched).toBe(0);
  });

  it("marks items not found in DataJud as failed", async () => {
    const repository = createRepository();
    const service = createCaseImportBatchService(repository, {
      async fetchCase() {
        throw new DataJudCaseNotFoundError();
      }
    });

    const batch = await service.create({ cnjNumbers: [cnjTjsp] });

    expect(batch.items[0].status).toBe("failed");
    expect(batch.items[0].errorMessage).toMatch(/não encontrado/i);
  });

  it("deduplicates repeated CNJ numbers in the same request", async () => {
    const service = createCaseImportBatchService(createRepository(), workingProvider);
    const batch = await service.create({ cnjNumbers: [cnjTjsp, cnjTjsp] });
    expect(batch.items).toHaveLength(1);
  });

  it("links active clients to pending items and rejects inactive ones", async () => {
    const repository = createRepository();
    const service = createCaseImportBatchService(repository, workingProvider);
    const batch = await service.create({ cnjNumbers: [cnjTjsp] });
    const item = batch.items[0];

    const updated = await service.updateItem(batch.id, item.id, { clientId: "client-1" });
    expect(updated.items[0].clientId).toBe("client-1");

    await expect(service.updateItem(batch.id, item.id, { clientId: "missing" })).rejects.toBeInstanceOf(CaseImportClientError);
  });

  it("discards and restores items", async () => {
    const repository = createRepository();
    const service = createCaseImportBatchService(repository, workingProvider);
    const batch = await service.create({ cnjNumbers: [cnjTjsp] });
    const item = batch.items[0];

    const discarded = await service.updateItem(batch.id, item.id, { status: "discarded" });
    expect(discarded.items[0].status).toBe("discarded");

    await expect(service.updateItem(batch.id, item.id, { clientId: "client-1" })).rejects.toBeInstanceOf(CaseImportItemStateError);

    const restored = await service.updateItem(batch.id, item.id, { status: "pending" });
    expect(restored.items[0].status).toBe("pending");
  });

  it("imports only items linked to a client and completes the batch when none are left pending", async () => {
    const repository = createRepository();
    const service = createCaseImportBatchService(repository, workingProvider);
    const batch = await service.create({ cnjNumbers: [cnjTjsp, cnjTjrj] });
    const [first, second] = batch.items;

    await service.updateItem(batch.id, first.id, { clientId: "client-1" });
    await service.updateItem(batch.id, second.id, { status: "discarded" });

    const result = await service.confirm(batch.id);

    expect(result.imported).toBe(1);
    expect(result.importedMovements).toBe(1);
    expect(repository.importedItemIds).toEqual([first.id]);
    expect(result.batch.status).toBe("completed");
  });

  it("keeps the batch open when pending items remain after confirm", async () => {
    const repository = createRepository();
    const service = createCaseImportBatchService(repository, workingProvider);
    const batch = await service.create({ cnjNumbers: [cnjTjsp, cnjTjrj] });

    await service.updateItem(batch.id, batch.items[0].id, { clientId: "client-1" });
    const result = await service.confirm(batch.id);

    expect(result.batch.status).toBe("open");
    expect(result.batch.items.find((item) => item.id === batch.items[1].id)?.status).toBe("pending");
    await expect(service.confirm("missing")).rejects.toThrow();
  });

  it("re-checks duplicates at confirm time", async () => {
    const repository = createRepository();
    const service = createCaseImportBatchService(repository, workingProvider);
    const batch = await service.create({ cnjNumbers: [cnjTjsp] });
    await service.updateItem(batch.id, batch.items[0].id, { clientId: "client-1" });

    repository.findByCnjNumber = async (cnjNumber: string) => caseRecord({ id: "case-existing", cnjNumber });

    const result = await service.confirm(batch.id);

    expect(result.imported).toBe(0);
    expect(result.duplicates).toBe(1);
    expect(result.batch.items[0].status).toBe("duplicate");
    expect(result.batch.items[0].caseId).toBe("case-existing");
  });

  it("rejects confirming with no ready items and updating completed batches", async () => {
    const repository = createRepository();
    const service = createCaseImportBatchService(repository, workingProvider);
    const batch = await service.create({ cnjNumbers: [cnjTjsp] });

    await expect(service.confirm(batch.id)).rejects.toBeInstanceOf(CaseImportBatchEmptyError);

    await service.updateItem(batch.id, batch.items[0].id, { status: "discarded" });
    await repository.setBatchStatus(batch.id, "completed");

    await expect(service.updateItem(batch.id, batch.items[0].id, { status: "pending" })).rejects.toBeInstanceOf(CaseImportBatchStateError);
  });

  it("serializes draft dates for storage", () => {
    const stored = serializeDraft(draft(cnjTjsp));
    expect(stored.openedAt).toBe(now.toISOString());
    expect(stored.movements[0].occurredAt).toBe(now.toISOString());
  });
});
