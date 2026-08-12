import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type { DocumentListFilters } from "./documents.schemas.js";
import type {
  DocumentRecord,
  DocumentsRepository,
} from "./documents.service.js";

const includeRelations = {
  client: { select: { name: true } },
  case: { select: { title: true, cnjNumber: true } },
};

type DbDocument = Prisma.DocumentGetPayload<{
  include: typeof includeRelations;
}>;

function toRecord(item: DbDocument): DocumentRecord {
  return {
    ...item,
    clientName: item.client.name,
    caseTitle: item.case?.title ?? null,
    caseCnjNumber: item.case?.cnjNumber ?? null,
  };
}

function listWhere(filters: DocumentListFilters): Prisma.DocumentWhereInput {
  const where: Prisma.DocumentWhereInput = { deletedAt: null };
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.caseId) where.caseId = filters.caseId;
  if (filters.scope === "client") where.caseId = null;
  if (filters.scope === "case") where.caseId = { not: null };
  if (filters.q)
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { originalName: { contains: filters.q, mode: "insensitive" } },
      { client: { name: { contains: filters.q, mode: "insensitive" } } },
      { case: { title: { contains: filters.q, mode: "insensitive" } } },
    ];
  return where;
}

export const documentsRepository: DocumentsRepository = {
  async list(filters) {
    const items = await prisma.document.findMany({
      where: listWhere(filters),
      include: includeRelations,
      orderBy: { updatedAt: "desc" },
    });
    return items.map(toRecord);
  },
  async findById(id, includeDeleted = false) {
    const item = await prisma.document.findFirst({
      where: { id, ...(!includeDeleted && { deletedAt: null }) },
      include: includeRelations,
    });
    return item ? toRecord(item) : null;
  },
  findClientById: (id) =>
    prisma.client.findUnique({ where: { id }, select: { id: true } }),
  findCaseById: (id) =>
    prisma.case.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    }),
  async create(data) {
    return toRecord(
      await prisma.document.create({ data, include: includeRelations }),
    );
  },
  async softDelete(id, deletedAt, purgeAfter) {
    const result = await prisma.document.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt, purgeAfter },
    });
    if (!result.count) return null;
    const item = await prisma.document.findUniqueOrThrow({
      where: { id },
      include: includeRelations,
    });
    return toRecord(item);
  },
  async findDueForPurge(now) {
    return (
      await prisma.document.findMany({
        where: { purgeAfter: { lte: now } },
        include: includeRelations,
      })
    ).map(toRecord);
  },
  async hardDelete(id) {
    await prisma.document.delete({ where: { id } });
  },
};
