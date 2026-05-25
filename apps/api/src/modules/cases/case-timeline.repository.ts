import { prisma } from "../../shared/db/prisma.js";
import type { CaseTimelineEventType, CreateCaseTimelineEventInput } from "./case-timeline.schemas.js";
import type { CaseTimelineEventRecord } from "./case-timeline.service.js";

type DbCaseTimelineEventType = "NOTE" | "HEARING" | "PETITION" | "DECISION" | "STATUS_CHANGE" | "OTHER";

type DbCaseTimelineEvent = {
  id: string;
  caseId: string;
  createdByUserId: string | null;
  type: DbCaseTimelineEventType;
  title: string;
  description: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  createdByUser?: { name: string } | null;
};

const toDbType = (value: CaseTimelineEventType): DbCaseTimelineEventType => value.toUpperCase() as DbCaseTimelineEventType;
const toApiType = (value: DbCaseTimelineEventType): CaseTimelineEventType => value.toLowerCase() as CaseTimelineEventType;

function toRecord(item: DbCaseTimelineEvent): CaseTimelineEventRecord {
  return {
    id: item.id,
    caseId: item.caseId,
    createdByUserId: item.createdByUserId,
    createdByUserName: item.createdByUser?.name ?? null,
    type: toApiType(item.type),
    title: item.title,
    description: item.description,
    occurredAt: item.occurredAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

const includeUser = { createdByUser: { select: { name: true } } };

export const caseTimelineRepository = {
  async findCaseById(id: string) {
    return prisma.case.findUnique({ where: { id }, select: { id: true } });
  },

  async list(caseId: string) {
    const items = await prisma.caseTimelineEvent.findMany({
      where: { caseId },
      include: includeUser,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }]
    });
    return items.map((item) => toRecord(item as DbCaseTimelineEvent));
  },

  async create(caseId: string, data: CreateCaseTimelineEventInput & { occurredAt: Date }, createdByUserId: string | null) {
    const item = await prisma.caseTimelineEvent.create({
      data: {
        caseId,
        createdByUserId,
        type: toDbType(data.type),
        title: data.title,
        description: data.description ?? null,
        occurredAt: data.occurredAt
      },
      include: includeUser
    });
    return toRecord(item as DbCaseTimelineEvent);
  }
};
