import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type { CreateDocumentInput, DocumentListFilters } from "./documents.schemas.js";
import type { DocumentRecord } from "./documents.service.js";

type DbDocument = {
  id: string;
  clientId: string;
  caseId: string | null;
  name: string;
  path: string;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  client?: { name: string } | null;
  case?: { title: string } | null;
};

const includeRelations = {
  client: { select: { name: true } },
  case: { select: { title: true } }
};

function toRecord(item: DbDocument): DocumentRecord {
  return {
    id: item.id,
    clientId: item.clientId,
    caseId: item.caseId,
    name: item.name,
    path: item.path,
    mimeType: item.mimeType,
    clientName: item.client?.name ?? null,
    caseTitle: item.case?.title ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function listWhere(filters: DocumentListFilters): Prisma.DocumentWhereInput {
  const where: Prisma.DocumentWhereInput = {};
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.caseId) where.caseId = filters.caseId;
  if (filters.scope === "client") where.caseId = null;
  if (filters.scope === "case") where.caseId = { not: null };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { mimeType: { contains: filters.q, mode: "insensitive" } },
      { client: { name: { contains: filters.q, mode: "insensitive" } } },
      { case: { title: { contains: filters.q, mode: "insensitive" } } }
    ];
  }
  return where;
}

export const documentsRepository = {
  async list(filters: DocumentListFilters) {
    const items = await prisma.document.findMany({
      where: listWhere(filters),
      include: includeRelations,
      orderBy: { updatedAt: "desc" }
    });
    return items.map((item) => toRecord(item as DbDocument));
  },

  async findClientById(id: string) {
    return prisma.client.findUnique({ where: { id }, select: { id: true } });
  },

  async findCaseById(id: string) {
    return prisma.case.findUnique({ where: { id }, select: { id: true, clientId: true } });
  },

  async create(data: CreateDocumentInput) {
    const item = await prisma.document.create({
      data: { ...data, caseId: data.caseId ?? null },
      include: includeRelations
    });
    return toRecord(item as DbDocument);
  }
};
