import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import { createCaseWithMovements } from "./case-import.repository.js";
import { casesRepository } from "./cases.repository.js";
import type {
  CaseImportBatchRecord,
  CaseImportBatchStatus,
  CaseImportItemRecord,
  CaseImportItemStatus,
  NewCaseImportItem,
  StoredCaseDraft,
} from "./case-import-batch.service.js";
import type {
  CaseImportCreation,
  ImportedCaseDraft,
} from "./case-import.service.js";

type DbBatchStatus = "OPEN" | "COMPLETED";
type DbItemStatus =
  | "PENDING"
  | "DUPLICATE"
  | "FAILED"
  | "IMPORTED"
  | "DISCARDED";

const toApiBatchStatus = (status: DbBatchStatus) =>
  status.toLowerCase() as CaseImportBatchStatus;
const toDbBatchStatus = (status: CaseImportBatchStatus) =>
  status.toUpperCase() as DbBatchStatus;
const toApiItemStatus = (status: DbItemStatus) =>
  status.toLowerCase() as CaseImportItemStatus;
const toDbItemStatus = (status: CaseImportItemStatus) =>
  status.toUpperCase() as DbItemStatus;

type DbItem = {
  id: string;
  batchId: string;
  cnjNumber: string;
  courtCode: string | null;
  status: DbItemStatus;
  errorMessage: string | null;
  draft: Prisma.JsonValue | null;
  financeData: Prisma.JsonValue | null;
  clientId: string | null;
  caseId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DbBatch = {
  id: string;
  status: DbBatchStatus;
  source: string;
  items: DbItem[];
  createdAt: Date;
  updatedAt: Date;
};

type DbItemWrite = Partial<
  Omit<
    DbItem,
    "id" | "batchId" | "createdAt" | "updatedAt" | "draft" | "financeData"
  >
> & {
  draft?: Prisma.InputJsonValue;
  financeData?: Prisma.InputJsonValue;
};

/**
 * Minimal structural view of the Prisma client for the CaseImportBatch /
 * CaseImportItem models. Typed locally so the module compiles even before
 * `prisma generate` runs against the updated schema; the shapes match the
 * generated delegates.
 */
type Db = {
  caseImportBatch: {
    create(args: {
      data: { items: { create: DbItemWrite[] } };
      include: { items: typeof itemsOrder };
    }): Promise<DbBatch>;
    findMany(args: {
      orderBy: { createdAt: "desc" };
      take: number;
      include: { items: typeof itemsOrder };
    }): Promise<DbBatch[]>;
    findUnique(args: {
      where: { id: string };
      include: { items: typeof itemsOrder };
    }): Promise<DbBatch | null>;
    update(args: {
      where: { id: string };
      data: { status: DbBatchStatus };
    }): Promise<DbBatch>;
  };
  caseImportItem: {
    update(args: { where: { id: string }; data: DbItemWrite }): Promise<DbItem>;
  };
  $transaction<T>(
    fn: (
      tx: Prisma.TransactionClient & Pick<Db, "caseImportItem">,
    ) => Promise<T>,
  ): Promise<T>;
};

const db = prisma as unknown as Db;

function toItemRecord(item: DbItem): CaseImportItemRecord {
  return {
    ...item,
    status: toApiItemStatus(item.status),
    draft: (item.draft as StoredCaseDraft | null) ?? null,
    financeData:
      (item.financeData as CaseImportItemRecord["financeData"]) ?? null,
  };
}

function toBatchRecord(batch: DbBatch): CaseImportBatchRecord {
  return {
    ...batch,
    status: toApiBatchStatus(batch.status),
    items: batch.items.map(toItemRecord),
  };
}

const itemsOrder = { orderBy: { createdAt: "asc" as const } };

export const caseImportBatchRepository = {
  findClientById: casesRepository.findClientById,
  findByCnjNumber: casesRepository.findByCnjNumber,

  async createBatch(items: NewCaseImportItem[]) {
    const batch = await db.caseImportBatch.create({
      data: {
        items: {
          create: items.map((item) => ({
            cnjNumber: item.cnjNumber,
            courtCode: item.courtCode,
            status: toDbItemStatus(item.status),
            errorMessage: item.errorMessage,
            draft: item.draft
              ? (item.draft as unknown as Prisma.InputJsonValue)
              : undefined,
            caseId: item.caseId,
          })),
        },
      },
      include: { items: itemsOrder },
    });
    return toBatchRecord(batch as DbBatch);
  },

  async listBatches(limit: number) {
    const batches = await db.caseImportBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { items: itemsOrder },
    });
    return batches.map((batch) => toBatchRecord(batch as DbBatch));
  },

  async findBatchById(id: string) {
    const batch = await db.caseImportBatch.findUnique({
      where: { id },
      include: { items: itemsOrder },
    });
    return batch ? toBatchRecord(batch as DbBatch) : null;
  },

  async updateItem(
    itemId: string,
    data: Partial<
      Pick<
        CaseImportItemRecord,
        "status" | "clientId" | "caseId" | "errorMessage" | "financeData"
      >
    >,
  ) {
    await db.caseImportItem.update({
      where: { id: itemId },
      data: {
        ...(data.status !== undefined
          ? { status: toDbItemStatus(data.status) }
          : {}),
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.caseId !== undefined ? { caseId: data.caseId } : {}),
        ...(data.errorMessage !== undefined
          ? { errorMessage: data.errorMessage }
          : {}),
        ...(data.financeData !== undefined
          ? {
              financeData: data.financeData as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
  },

  async importItem(
    itemId: string,
    clientId: string,
    draft: ImportedCaseDraft,
    creation: CaseImportCreation,
  ) {
    const imported = await db.$transaction(async (tx) => {
      const result = await createCaseWithMovements(
        tx,
        clientId,
        draft,
        creation,
      );
      await tx.caseImportItem.update({
        where: { id: itemId },
        data: { status: "IMPORTED", clientId, caseId: result.item.id },
      });
      return result;
    });

    return {
      caseId: imported.item.id,
      importedMovements: imported.movementCount,
      skippedMovements: draft.movements.length - imported.movementCount,
    };
  },

  async setBatchStatus(batchId: string, status: CaseImportBatchStatus) {
    await db.caseImportBatch.update({
      where: { id: batchId },
      data: { status: toDbBatchStatus(status) },
    });
  },
};
