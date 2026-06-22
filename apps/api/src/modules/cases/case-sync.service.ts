import type { ImportedCaseDraft, ImportedMovement } from "./case-import.service.js";
import { courtCodeFromCnj } from "./datajud-court.js";

export type CaseSyncTrigger = "manual" | "scheduled";
export type CaseSyncStatus = "success" | "no_changes" | "failed";

export type SyncableCase = {
  id: string;
  cnjNumber: string | null;
  title: string;
  responsibleUserId: string | null;
};

export type CaseSyncRunRecord = {
  id: string;
  caseId: string;
  triggeredByUserId: string | null;
  triggeredByUserName: string | null;
  trigger: CaseSyncTrigger;
  status: CaseSyncStatus;
  newMovements: number;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

export type CaseSyncResult = {
  caseId: string;
  status: CaseSyncStatus;
  newMovements: number;
  errorMessage: string | null;
};

export type CaseSyncBatchResult = {
  total: number;
  updated: number;
  unchanged: number;
  failed: number;
  newMovements: number;
};

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

type CreateNotificationsInput = {
  userIds: string[];
  caseId: string;
  title: string;
  body: string;
  newMovements: number;
};

type CaseSyncRepository = {
  findSyncableCaseById(id: string): Promise<SyncableCase | null>;
  listSyncableActiveCases(): Promise<SyncableCase[]>;
  applyMovements(caseId: string, movements: ImportedMovement[]): Promise<number>;
  recordRun(input: RecordRunInput): Promise<CaseSyncRunRecord>;
  listRuns(caseId: string): Promise<CaseSyncRunRecord[]>;
  findRecipientUserIds(caseId: string): Promise<string[]>;
  createNotifications(input: CreateNotificationsInput): Promise<number>;
};

type CaseSyncProvider = {
  fetchCase(input: { cnjNumber: string; courtCode: string }): Promise<ImportedCaseDraft>;
};

type CaseSyncOptions = {
  resolveCourtCode?: (cnjNumber: string) => string;
};

export class CaseSyncCaseNotFoundError extends Error {
  constructor() {
    super("Case not found");
  }
}

export class CaseSyncMissingCnjError extends Error {
  constructor() {
    super("Case has no CNJ number to sync");
  }
}

function uniqueMovements(movements: ImportedMovement[]) {
  const seen = new Set<string>();
  const unique: ImportedMovement[] = [];

  for (const movement of movements) {
    if (seen.has(movement.sourceHash)) continue;
    seen.add(movement.sourceHash);
    unique.push(movement);
  }

  return unique;
}

function movementsLabel(count: number) {
  return count === 1 ? "1 novo andamento" : `${count} novos andamentos`;
}

export function createCaseSyncService(repository: CaseSyncRepository, provider: CaseSyncProvider, options: CaseSyncOptions = {}) {
  const resolveCourtCode = options.resolveCourtCode ?? courtCodeFromCnj;

  async function notifyRecipients(item: SyncableCase, newMovements: number) {
    const userIds = await repository.findRecipientUserIds(item.id);
    if (userIds.length === 0) return;

    await repository.createNotifications({
      userIds,
      caseId: item.id,
      title: `Atualização em ${item.title}`,
      body: `${movementsLabel(newMovements)} encontrado(s) no DataJud.`,
      newMovements
    });
  }

  async function runForCase(item: SyncableCase, trigger: CaseSyncTrigger, triggeredByUserId: string | null): Promise<CaseSyncResult> {
    const startedAt = new Date();

    try {
      if (!item.cnjNumber) throw new CaseSyncMissingCnjError();

      const courtCode = resolveCourtCode(item.cnjNumber);
      const draft = await provider.fetchCase({ cnjNumber: item.cnjNumber, courtCode });
      const newMovements = await repository.applyMovements(item.id, uniqueMovements(draft.movements));
      const status: CaseSyncStatus = newMovements > 0 ? "success" : "no_changes";

      await repository.recordRun({
        caseId: item.id,
        triggeredByUserId,
        trigger,
        status,
        newMovements,
        errorMessage: null,
        startedAt,
        finishedAt: new Date()
      });

      if (newMovements > 0) await notifyRecipients(item, newMovements);

      return { caseId: item.id, status, newMovements, errorMessage: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Case sync failed";

      await repository.recordRun({
        caseId: item.id,
        triggeredByUserId,
        trigger,
        status: "failed",
        newMovements: 0,
        errorMessage,
        startedAt,
        finishedAt: new Date()
      });

      return { caseId: item.id, status: "failed", newMovements: 0, errorMessage };
    }
  }

  return {
    async syncCase(caseId: string, context: { trigger: CaseSyncTrigger; triggeredByUserId: string | null }) {
      const item = await repository.findSyncableCaseById(caseId);
      if (!item) throw new CaseSyncCaseNotFoundError();
      if (!item.cnjNumber) throw new CaseSyncMissingCnjError();
      return runForCase(item, context.trigger, context.triggeredByUserId);
    },

    async syncAllActive(context: { trigger: CaseSyncTrigger; triggeredByUserId: string | null }): Promise<CaseSyncBatchResult> {
      const items = await repository.listSyncableActiveCases();
      const result: CaseSyncBatchResult = { total: items.length, updated: 0, unchanged: 0, failed: 0, newMovements: 0 };

      for (const item of items) {
        const outcome = await runForCase(item, context.trigger, context.triggeredByUserId);
        if (outcome.status === "failed") result.failed += 1;
        else if (outcome.status === "success") {
          result.updated += 1;
          result.newMovements += outcome.newMovements;
        } else result.unchanged += 1;
      }

      return result;
    },

    async listRuns(caseId: string) {
      const item = await repository.findSyncableCaseById(caseId);
      if (!item) throw new CaseSyncCaseNotFoundError();
      return repository.listRuns(caseId);
    }
  };
}
