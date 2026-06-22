import { describe, expect, it } from "vitest";
import type { ImportedCaseDraft, ImportedMovement } from "./case-import.service.js";
import {
  CaseSyncCaseNotFoundError,
  CaseSyncMissingCnjError,
  createCaseSyncService,
  type CaseSyncRunRecord,
  type CaseSyncStatus,
  type CaseSyncTrigger,
  type SyncableCase
} from "./case-sync.service.js";

type RecordRunInput = {
  caseId: string;
  triggeredByUserId: string | null;
  trigger: CaseSyncTrigger;
  status: CaseSyncStatus;
  newMovements: number;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date;
};

const cnjNumber = "00000012320268260000";

const movement = (overrides: Partial<ImportedMovement> = {}): ImportedMovement => ({
  externalId: "1-2026-01-01T00:00:00.000Z",
  sourceHash: "hash-1",
  type: "other",
  title: "Conclusos para decisão",
  description: null,
  occurredAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides
});

const draft = (movements: ImportedMovement[]): ImportedCaseDraft => ({
  cnjNumber,
  title: `Procedimento - ${cnjNumber}`,
  court: "TJSP",
  jurisdiction: null,
  division: null,
  description: null,
  openedAt: null,
  movements
});

type FakeOptions = {
  cases?: SyncableCase[];
  recipients?: string[];
  newMovements?: number;
};

function createFakeRepository(options: FakeOptions = {}) {
  const state = {
    runs: [] as CaseSyncRunRecord[],
    notifications: [] as { userIds: string[]; caseId: string; newMovements: number }[],
    appliedMovements: [] as ImportedMovement[]
  };

  const cases =
    options.cases ?? [{ id: "case-1", cnjNumber, title: "Ação trabalhista", responsibleUserId: "user-1" }];

  const repository = {
    state,
    async findSyncableCaseById(id: string) {
      return cases.find((item) => item.id === id) ?? null;
    },
    async listSyncableActiveCases() {
      return cases;
    },
    async applyMovements(_caseId: string, movements: ImportedMovement[]) {
      state.appliedMovements = movements;
      return options.newMovements ?? movements.length;
    },
    async recordRun(input: RecordRunInput) {
      const run: CaseSyncRunRecord = {
        id: `run-${state.runs.length + 1}`,
        caseId: input.caseId,
        triggeredByUserId: input.triggeredByUserId,
        triggeredByUserName: null,
        trigger: input.trigger,
        status: input.status,
        newMovements: input.newMovements,
        errorMessage: input.errorMessage,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt
      };
      state.runs.push(run);
      return run;
    },
    async listRuns() {
      return state.runs;
    },
    async findRecipientUserIds() {
      return options.recipients ?? ["user-1"];
    },
    async createNotifications(input: { userIds: string[]; caseId: string; newMovements: number }) {
      state.notifications.push({ userIds: input.userIds, caseId: input.caseId, newMovements: input.newMovements });
      return input.userIds.length;
    }
  };

  return repository;
}

describe("case sync service", () => {
  it("imports new movements, records a successful run and notifies recipients", async () => {
    const repository = createFakeRepository({ newMovements: 2, recipients: ["user-1"] });
    const service = createCaseSyncService(repository, {
      async fetchCase() {
        return draft([movement(), movement({ sourceHash: "hash-2" })]);
      }
    });

    const result = await service.syncCase("case-1", { trigger: "manual", triggeredByUserId: "user-1" });

    expect(result).toMatchObject({ status: "success", newMovements: 2 });
    expect(repository.state.runs).toHaveLength(1);
    expect(repository.state.runs[0]).toMatchObject({ status: "success", trigger: "manual", newMovements: 2 });
    expect(repository.state.notifications).toEqual([{ userIds: ["user-1"], caseId: "case-1", newMovements: 2 }]);
  });

  it("records a no_changes run and skips notifications when nothing is new", async () => {
    const repository = createFakeRepository({ newMovements: 0 });
    const service = createCaseSyncService(repository, {
      async fetchCase() {
        return draft([movement()]);
      }
    });

    const result = await service.syncCase("case-1", { trigger: "scheduled", triggeredByUserId: null });

    expect(result.status).toBe("no_changes");
    expect(repository.state.runs[0].status).toBe("no_changes");
    expect(repository.state.notifications).toHaveLength(0);
  });

  it("deduplicates movements before applying them", async () => {
    const repository = createFakeRepository();
    const service = createCaseSyncService(repository, {
      async fetchCase() {
        return draft([movement(), movement({ externalId: "other" }), movement({ sourceHash: "hash-2" })]);
      }
    });

    await service.syncCase("case-1", { trigger: "manual", triggeredByUserId: "user-1" });

    expect(repository.state.appliedMovements.map((item) => item.sourceHash)).toEqual(["hash-1", "hash-2"]);
  });

  it("records a failed run without notifying when DataJud fails", async () => {
    const repository = createFakeRepository();
    const service = createCaseSyncService(repository, {
      async fetchCase() {
        throw new Error("DataJud request failed");
      }
    });

    const result = await service.syncCase("case-1", { trigger: "manual", triggeredByUserId: "user-1" });

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("DataJud request failed");
    expect(repository.state.runs[0].status).toBe("failed");
    expect(repository.state.notifications).toHaveLength(0);
  });

  it("rejects cases without a CNJ number", async () => {
    const repository = createFakeRepository({
      cases: [{ id: "case-1", cnjNumber: null, title: "Extrajudicial", responsibleUserId: null }]
    });
    const service = createCaseSyncService(repository, {
      async fetchCase() {
        return draft([movement()]);
      }
    });

    await expect(service.syncCase("case-1", { trigger: "manual", triggeredByUserId: null })).rejects.toBeInstanceOf(CaseSyncMissingCnjError);
  });

  it("throws when the case does not exist", async () => {
    const repository = createFakeRepository();
    const service = createCaseSyncService(repository, {
      async fetchCase() {
        return draft([movement()]);
      }
    });

    await expect(service.syncCase("missing", { trigger: "manual", triggeredByUserId: null })).rejects.toBeInstanceOf(
      CaseSyncCaseNotFoundError
    );
  });

  it("aggregates results across all active cases", async () => {
    const repository = createFakeRepository({
      cases: [
        { id: "case-1", cnjNumber, title: "Caso 1", responsibleUserId: "user-1" },
        { id: "case-2", cnjNumber, title: "Caso 2", responsibleUserId: null }
      ],
      newMovements: 1
    });
    const service = createCaseSyncService(repository, {
      async fetchCase() {
        return draft([movement()]);
      }
    });

    const result = await service.syncAllActive({ trigger: "scheduled", triggeredByUserId: null });

    expect(result).toMatchObject({ total: 2, updated: 2, unchanged: 0, failed: 0, newMovements: 2 });
  });
});
