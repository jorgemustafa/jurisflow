import type { CaseFinanceInput } from "@jurisflow/shared";
import { deriveCourtFromCnj } from "./cnj.js";
import {
  DataJudCaseNotFoundError,
  DataJudConfigError,
} from "./datajud.client.js";
import {
  CaseImportClientError,
  prepareCaseImport,
  type CaseImportCreation,
  type ImportedCaseDraft,
  type ImportedMovement,
} from "./case-import.service.js";
import type {
  CreateCaseImportBatchInput,
  UpdateCaseImportItemInput,
} from "./case-import-batch.schemas.js";
import type { CaseRecord } from "./cases.service.js";
import type { PreviewCaseImportInput } from "./case-import.schemas.js";

export type CaseImportBatchStatus = "open" | "completed";
export type CaseImportItemStatus =
  | "pending"
  | "duplicate"
  | "failed"
  | "imported"
  | "discarded";

export type StoredCaseDraft = Omit<
  ImportedCaseDraft,
  "openedAt" | "movements"
> & {
  openedAt: string | null;
  movements: (Omit<ImportedMovement, "occurredAt"> & { occurredAt: string })[];
};

export type CaseImportItemRecord = {
  id: string;
  batchId: string;
  cnjNumber: string;
  courtCode: string | null;
  status: CaseImportItemStatus;
  errorMessage: string | null;
  draft: StoredCaseDraft | null;
  financeData: CaseFinanceInput | null;
  clientId: string | null;
  caseId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CaseImportBatchRecord = {
  id: string;
  status: CaseImportBatchStatus;
  source: string;
  items: CaseImportItemRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type NewCaseImportItem = {
  cnjNumber: string;
  courtCode: string | null;
  status: CaseImportItemStatus;
  errorMessage: string | null;
  draft: StoredCaseDraft | null;
  caseId: string | null;
};

type ClientRef = { id: string; status: "active" | "inactive" };

type CaseImportBatchRepository = {
  findByCnjNumber(cnjNumber: string): Promise<CaseRecord | null>;
  findClientById(id: string): Promise<ClientRef | null>;
  createBatch(items: NewCaseImportItem[]): Promise<CaseImportBatchRecord>;
  listBatches(limit: number): Promise<CaseImportBatchRecord[]>;
  findBatchById(id: string): Promise<CaseImportBatchRecord | null>;
  updateItem(
    itemId: string,
    data: Partial<
      Pick<
        CaseImportItemRecord,
        "status" | "clientId" | "caseId" | "errorMessage" | "financeData"
      >
    >,
  ): Promise<void>;
  importItem(
    itemId: string,
    clientId: string,
    draft: ImportedCaseDraft,
    creation: CaseImportCreation,
  ): Promise<{
    caseId: string;
    importedMovements: number;
    skippedMovements: number;
  }>;
  setBatchStatus(batchId: string, status: CaseImportBatchStatus): Promise<void>;
};

type CaseImportBatchProvider = {
  fetchCase(input: PreviewCaseImportInput): Promise<ImportedCaseDraft>;
};

export class CaseImportBatchNotFoundError extends Error {
  constructor() {
    super("Import batch not found");
  }
}

export class CaseImportItemNotFoundError extends Error {
  constructor() {
    super("Import item not found");
  }
}

export class CaseImportBatchStateError extends Error {
  constructor(message = "Import batch is not open") {
    super(message);
  }
}

export class CaseImportItemStateError extends Error {
  constructor(message = "Import item cannot be updated in its current status") {
    super(message);
  }
}

export class CaseImportBatchEmptyError extends Error {
  constructor() {
    super(
      "No items are ready to import; fill client and finance data for at least one pending item",
    );
  }
}

export function serializeDraft(draft: ImportedCaseDraft): StoredCaseDraft {
  return {
    ...draft,
    openedAt: draft.openedAt ? draft.openedAt.toISOString() : null,
    movements: draft.movements.map((movement) => ({
      ...movement,
      occurredAt: movement.occurredAt.toISOString(),
    })),
  };
}

export function parseDraft(draft: StoredCaseDraft): ImportedCaseDraft {
  return {
    ...draft,
    openedAt: draft.openedAt ? new Date(draft.openedAt) : null,
    movements: draft.movements.map((movement) => ({
      ...movement,
      occurredAt: new Date(movement.occurredAt),
    })),
  };
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

export function createCaseImportBatchService(
  repository: CaseImportBatchRepository,
  provider: CaseImportBatchProvider,
  options: { concurrency?: number; now?: () => Date } = {},
) {
  const concurrency = options.concurrency ?? 4;
  const now = options.now ?? (() => new Date());

  async function buildItem(cnjNumber: string): Promise<NewCaseImportItem> {
    const court = deriveCourtFromCnj(cnjNumber);
    if (!court) {
      return {
        cnjNumber,
        courtCode: null,
        status: "failed",
        errorMessage: "Não foi possível identificar o tribunal pelo número CNJ",
        draft: null,
        caseId: null,
      };
    }

    const existing = await repository.findByCnjNumber(cnjNumber);
    if (existing) {
      return {
        cnjNumber,
        courtCode: court.code,
        status: "duplicate",
        errorMessage: null,
        draft: null,
        caseId: existing.id,
      };
    }

    try {
      const draft = await provider.fetchCase({
        cnjNumber,
        courtCode: court.code,
      });
      return {
        cnjNumber,
        courtCode: court.code,
        status: "pending",
        errorMessage: null,
        draft: serializeDraft({
          ...draft,
          movements: uniqueMovements(draft.movements),
        }),
        caseId: null,
      };
    } catch (error) {
      if (error instanceof DataJudConfigError) throw error;
      if (error instanceof DataJudCaseNotFoundError) {
        return {
          cnjNumber,
          courtCode: court.code,
          status: "failed",
          errorMessage: "Processo não encontrado no DataJud",
          draft: null,
          caseId: null,
        };
      }
      return {
        cnjNumber,
        courtCode: court.code,
        status: "failed",
        errorMessage: "Falha na consulta ao DataJud",
        draft: null,
        caseId: null,
      };
    }
  }

  async function getOpenBatch(batchId: string) {
    const batch = await repository.findBatchById(batchId);
    if (!batch) throw new CaseImportBatchNotFoundError();
    if (batch.status !== "open") throw new CaseImportBatchStateError();
    return batch;
  }

  async function completeBatchIfDone(batchId: string) {
    const batch = await repository.findBatchById(batchId);
    if (!batch) throw new CaseImportBatchNotFoundError();

    const hasPending = batch.items.some((item) => item.status === "pending");
    if (!hasPending && batch.status === "open") {
      await repository.setBatchStatus(batchId, "completed");
      return { ...batch, status: "completed" as const };
    }
    return batch;
  }

  return {
    async create(input: CreateCaseImportBatchInput) {
      const cnjNumbers = [...new Set(input.cnjNumbers)];
      const items = await mapWithConcurrency(
        cnjNumbers,
        concurrency,
        buildItem,
      );
      return repository.createBatch(items);
    },

    list() {
      return repository.listBatches(10);
    },

    async get(batchId: string) {
      const batch = await repository.findBatchById(batchId);
      if (!batch) throw new CaseImportBatchNotFoundError();
      return batch;
    },

    async updateItem(
      batchId: string,
      itemId: string,
      input: UpdateCaseImportItemInput,
    ) {
      const batch = await getOpenBatch(batchId);
      const item = batch.items.find((entry) => entry.id === itemId);
      if (!item) throw new CaseImportItemNotFoundError();

      if (input.status === "discarded") {
        if (item.status !== "pending")
          throw new CaseImportItemStateError(
            "Only pending items can be discarded",
          );
        await repository.updateItem(itemId, { status: "discarded" });
      }

      if (input.status === "pending") {
        if (item.status !== "discarded")
          throw new CaseImportItemStateError(
            "Only discarded items can be restored",
          );
        await repository.updateItem(itemId, { status: "pending" });
      }

      if (input.clientId !== undefined) {
        const status = input.status ?? item.status;
        if (status !== "pending")
          throw new CaseImportItemStateError(
            "Only pending items can be linked to a client",
          );

        if (input.clientId !== null) {
          const client = await repository.findClientById(input.clientId);
          if (!client) throw new CaseImportClientError("Client not found");
          if (client.status !== "active")
            throw new CaseImportClientError("Client must be active");
        }
        await repository.updateItem(itemId, { clientId: input.clientId });
      }

      if (input.finance !== undefined) {
        const status = input.status ?? item.status;
        if (status !== "pending")
          throw new CaseImportItemStateError(
            "Only pending items can receive finance data",
          );
        await repository.updateItem(itemId, { financeData: input.finance });
      }

      return this.get(batchId);
    },

    async confirm(batchId: string) {
      const batch = await getOpenBatch(batchId);
      const ready = batch.items.filter(
        (item) =>
          item.status === "pending" &&
          item.clientId &&
          item.draft &&
          item.financeData,
      );
      if (ready.length === 0) throw new CaseImportBatchEmptyError();

      let imported = 0;
      let duplicates = 0;
      let importedMovements = 0;

      for (const item of ready) {
        const existing = await repository.findByCnjNumber(item.cnjNumber);
        if (existing) {
          await repository.updateItem(item.id, {
            status: "duplicate",
            caseId: existing.id,
          });
          duplicates += 1;
          continue;
        }

        const clientId = item.clientId as string;
        const result = await repository.importItem(
          item.id,
          clientId,
          parseDraft(item.draft as StoredCaseDraft),
          prepareCaseImport(
            clientId,
            item.financeData as CaseFinanceInput,
            now(),
          ),
        );
        imported += 1;
        importedMovements += result.importedMovements;
      }

      const updated = await completeBatchIfDone(batchId);
      return { batch: updated, imported, duplicates, importedMovements };
    },
  };
}
