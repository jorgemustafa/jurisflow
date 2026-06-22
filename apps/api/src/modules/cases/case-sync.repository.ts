import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type { ImportedMovement } from "./case-import.service.js";
import type { CaseSyncRunRecord, CaseSyncStatus, CaseSyncTrigger, SyncableCase } from "./case-sync.service.js";

type DbTrigger = "MANUAL" | "SCHEDULED";
type DbStatus = "SUCCESS" | "NO_CHANGES" | "FAILED";

const toDbTrigger = (value: CaseSyncTrigger): DbTrigger => value.toUpperCase() as DbTrigger;
const toApiTrigger = (value: DbTrigger): CaseSyncTrigger => value.toLowerCase() as CaseSyncTrigger;
const toDbStatus = (value: CaseSyncStatus): DbStatus => value.toUpperCase() as DbStatus;
const toApiStatus = (value: DbStatus): CaseSyncStatus => value.toLowerCase() as CaseSyncStatus;

const syncableSelect = {
  id: true,
  cnjNumber: true,
  title: true,
  responsibleUserId: true
} satisfies Prisma.CaseSelect;

type DbSyncRun = {
  id: string;
  caseId: string;
  triggeredByUserId: string | null;
  trigger: DbTrigger;
  status: DbStatus;
  newMovements: number;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  triggeredByUser?: { name: string } | null;
};

function toRunRecord(item: DbSyncRun): CaseSyncRunRecord {
  return {
    id: item.id,
    caseId: item.caseId,
    triggeredByUserId: item.triggeredByUserId,
    triggeredByUserName: item.triggeredByUser?.name ?? null,
    trigger: toApiTrigger(item.trigger),
    status: toApiStatus(item.status),
    newMovements: item.newMovements,
    errorMessage: item.errorMessage,
    startedAt: item.startedAt,
    finishedAt: item.finishedAt
  };
}

export const caseSyncRepository = {
  async findSyncableCaseById(id: string): Promise<SyncableCase | null> {
    const item = await prisma.case.findUnique({ where: { id }, select: syncableSelect });
    return item ?? null;
  },

  async listSyncableActiveCases(): Promise<SyncableCase[]> {
    const items = await prisma.case.findMany({
      where: { status: "ACTIVE", caseType: "JUDICIAL", cnjNumber: { not: null } },
      select: syncableSelect,
      orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } }
    });
    return items;
  },

  async applyMovements(caseId: string, movements: ImportedMovement[]): Promise<number> {
    let count = 0;

    if (movements.length) {
      const result = await prisma.caseTimelineEvent.createMany({
        data: movements.map((movement) => ({
          caseId,
          externalSource: "datajud",
          externalId: movement.externalId,
          sourceHash: movement.sourceHash,
          type: movement.type.toUpperCase() as Prisma.CaseTimelineEventCreateManyInput["type"],
          title: movement.title,
          description: movement.description,
          occurredAt: movement.occurredAt
        })),
        skipDuplicates: true
      });
      count = result.count;
    }

    await prisma.case.update({ where: { id: caseId }, data: { lastSyncedAt: new Date() } });
    return count;
  },

  async recordRun(input: {
    caseId: string;
    triggeredByUserId: string | null;
    trigger: CaseSyncTrigger;
    status: CaseSyncStatus;
    newMovements: number;
    errorMessage: string | null;
    startedAt: Date;
    finishedAt: Date;
  }): Promise<CaseSyncRunRecord> {
    const item = await prisma.caseSyncRun.create({
      data: {
        caseId: input.caseId,
        triggeredByUserId: input.triggeredByUserId,
        trigger: toDbTrigger(input.trigger),
        status: toDbStatus(input.status),
        newMovements: input.newMovements,
        errorMessage: input.errorMessage,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt
      },
      include: { triggeredByUser: { select: { name: true } } }
    });
    return toRunRecord(item as DbSyncRun);
  },

  async listRuns(caseId: string): Promise<CaseSyncRunRecord[]> {
    const items = await prisma.caseSyncRun.findMany({
      where: { caseId },
      include: { triggeredByUser: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
      take: 50
    });
    return items.map((item) => toRunRecord(item as DbSyncRun));
  },

  async findRecipientUserIds(caseId: string): Promise<string[]> {
    const item = await prisma.case.findUnique({
      where: { id: caseId },
      select: { responsibleUser: { select: { id: true, status: true } } }
    });

    if (item?.responsibleUser && item.responsibleUser.status === "ACTIVE") {
      return [item.responsibleUser.id];
    }

    const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    return admins.map((admin) => admin.id);
  },

  async createNotifications(input: { userIds: string[]; caseId: string; title: string; body: string; newMovements: number }): Promise<number> {
    if (input.userIds.length === 0) return 0;

    const result = await prisma.notification.createMany({
      data: input.userIds.map((userId) => ({
        userId,
        caseId: input.caseId,
        title: input.title,
        body: input.body,
        newMovements: input.newMovements
      }))
    });
    return result.count;
  }
};
