import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type {
  CreateDeadlineInput,
  DeadlineListFilters,
  DeadlineStatus,
  UpdateDeadlineInput,
} from "./deadlines.schemas.js";
import type { DeadlineRecord } from "./deadlines.service.js";

type DbDeadlineStatus = "PENDING" | "DONE" | "CANCELED";

type DbDeadline = {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  dueAt: Date;
  status: DbDeadlineStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  case?: {
    title: string;
    cnjNumber: string | null;
    client: { name: string };
  } | null;
};

const toDbStatus = (value: DeadlineStatus): DbDeadlineStatus =>
  value.toUpperCase() as DbDeadlineStatus;
const toApiStatus = (value: DbDeadlineStatus): DeadlineStatus =>
  value.toLowerCase() as DeadlineStatus;

const includeCase = {
  case: {
    select: {
      title: true,
      cnjNumber: true,
      client: { select: { name: true } },
    },
  },
};

function toRecord(item: DbDeadline): DeadlineRecord {
  return {
    id: item.id,
    caseId: item.caseId,
    caseTitle: item.case?.title ?? null,
    caseCnjNumber: item.case?.cnjNumber ?? null,
    clientName: item.case?.client.name ?? null,
    title: item.title,
    description: item.description,
    dueAt: item.dueAt,
    status: toApiStatus(item.status),
    completedAt: item.completedAt,
    alertLevel: "none",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function listWhere(
  filters: DeadlineListFilters,
): Prisma.CaseDeadlineWhereInput {
  const where: Prisma.CaseDeadlineWhereInput = {};
  if (filters.status !== "all") where.status = toDbStatus(filters.status);
  if (filters.caseId) where.caseId = filters.caseId;
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { case: { title: { contains: filters.q, mode: "insensitive" } } },
      {
        case: {
          client: { name: { contains: filters.q, mode: "insensitive" } },
        },
      },
    ];
  }
  return where;
}

export const deadlinesRepository = {
  async findCaseById(id: string) {
    return prisma.case.findUnique({ where: { id }, select: { id: true } });
  },

  async findById(id: string) {
    const item = await prisma.caseDeadline.findUnique({
      where: { id },
      include: includeCase,
    });
    return item ? toRecord(item as DbDeadline) : null;
  },

  async list(filters: DeadlineListFilters) {
    const items = await prisma.caseDeadline.findMany({
      where: listWhere(filters),
      include: includeCase,
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    });
    return items.map((item) => toRecord(item as DbDeadline));
  },

  async create(caseId: string, data: CreateDeadlineInput) {
    const item = await prisma.caseDeadline.create({
      data: { ...data, caseId },
      include: includeCase,
    });
    return toRecord(item as DbDeadline);
  },

  async update(id: string, data: UpdateDeadlineInput) {
    const item = await prisma.caseDeadline.update({
      where: { id },
      data,
      include: includeCase,
    });
    return toRecord(item as DbDeadline);
  },

  async updateStatus(
    id: string,
    status: DeadlineStatus,
    completedAt: Date | null,
  ) {
    const item = await prisma.caseDeadline.update({
      where: { id },
      data: { status: toDbStatus(status), completedAt },
      include: includeCase,
    });
    return toRecord(item as DbDeadline);
  },
};
