import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import { writePayment } from "../payments/payments.repository.js";
import type { CreatePaymentData } from "../payments/payments.service.js";
import type {
  CaseListFilters,
  CaseStage,
  CaseStatus,
  CaseType,
  LegalArea,
  UpdateCaseInput,
} from "./cases.schemas.js";
import type { CaseRecord, CreateCaseRecordData } from "./cases.service.js";

type DbCaseType = "JUDICIAL" | "EXTRAJUDICIAL";
type DbCaseStatus = "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELED";
type DbCaseStage =
  | "INITIAL"
  | "HEARING_SCHEDULED"
  | "WAITING_DECISION"
  | "APPEAL"
  | "ENFORCEMENT";
type DbLegalArea =
  | "CIVIL"
  | "LABOR"
  | "FAMILY"
  | "CRIMINAL"
  | "TAX"
  | "CONSUMER"
  | "BUSINESS"
  | "SOCIAL_SECURITY"
  | "OTHER";

const digits = (value: string) => value.replace(/\D/g, "");
const toDbCaseType = (value: CaseType): DbCaseType =>
  value.toUpperCase() as DbCaseType;
const toApiCaseType = (value: DbCaseType): CaseType =>
  value.toLowerCase() as CaseType;
const toDbStatus = (value: CaseStatus): DbCaseStatus =>
  value.toUpperCase() as DbCaseStatus;
const toApiStatus = (value: DbCaseStatus): CaseStatus =>
  value.toLowerCase() as CaseStatus;
const toDbStage = (value: CaseStage): DbCaseStage =>
  value.toUpperCase() as DbCaseStage;
const toApiStage = (value: DbCaseStage): CaseStage =>
  value.toLowerCase() as CaseStage;
const toDbLegalArea = (value: LegalArea): DbLegalArea =>
  value.toUpperCase() as DbLegalArea;
const toApiLegalArea = (value: DbLegalArea): LegalArea =>
  value.toLowerCase() as LegalArea;

type DbCase = {
  id: string;
  clientId: string;
  client?: { name: string } | null;
  responsibleUserId: string | null;
  responsibleUser?: { name: string } | null;
  caseType: DbCaseType;
  title: string;
  cnjNumber: string | null;
  status: DbCaseStatus;
  stage: DbCaseStage | null;
  legalArea: DbLegalArea | null;
  opposingParty: string | null;
  court: string | null;
  jurisdiction: string | null;
  division: string | null;
  description: string | null;
  openedAt: Date | null;
  closedAt: Date | null;
  totalFeeAmountCents: number;
  createdAt: Date;
  updatedAt: Date;
};

function toCaseRecord(item: DbCase): CaseRecord {
  return {
    ...item,
    clientName: item.client?.name ?? null,
    responsibleUserName: item.responsibleUser?.name ?? null,
    caseType: toApiCaseType(item.caseType),
    status: toApiStatus(item.status),
    stage: item.stage ? toApiStage(item.stage) : null,
    legalArea: item.legalArea ? toApiLegalArea(item.legalArea) : null,
  };
}

function writeData(data: CreateCaseRecordData | UpdateCaseInput) {
  return {
    ...data,
    caseType: data.caseType ? toDbCaseType(data.caseType) : undefined,
    status: data.status ? toDbStatus(data.status) : undefined,
    stage: data.stage ? toDbStage(data.stage) : data.stage,
    legalArea: data.legalArea ? toDbLegalArea(data.legalArea) : data.legalArea,
  };
}

function listWhere(filters: CaseListFilters): Prisma.CaseWhereInput {
  const where: Prisma.CaseWhereInput = {};
  if (filters.status !== "all") where.status = toDbStatus(filters.status);
  if (filters.caseType && filters.caseType !== "all")
    where.caseType = toDbCaseType(filters.caseType);
  if (filters.stage && filters.stage !== "all")
    where.stage = toDbStage(filters.stage);
  if (filters.legalArea && filters.legalArea !== "all")
    where.legalArea = toDbLegalArea(filters.legalArea);
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.responsibleUserId)
    where.responsibleUserId = filters.responsibleUserId;

  if (filters.q) {
    const qDigits = digits(filters.q);
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { opposingParty: { contains: filters.q, mode: "insensitive" } },
      { client: { name: { contains: filters.q, mode: "insensitive" } } },
      ...(qDigits ? [{ cnjNumber: { contains: qDigits } }] : []),
    ];
  }

  return where;
}

export const casesRepository = {
  async list(filters: CaseListFilters) {
    const cases = await prisma.case.findMany({
      where: listWhere(filters),
      include: { client: { select: { name: true } }, responsibleUser: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return cases.map((item) => toCaseRecord(item as DbCase));
  },

  async findById(id: string) {
    const item = await prisma.case.findUnique({
      where: { id },
      include: { client: { select: { name: true } }, responsibleUser: { select: { name: true } } },
    });
    return item ? toCaseRecord(item as DbCase) : null;
  },

  async findClientById(
    id: string,
  ): Promise<{ id: string; status: "active" | "inactive" } | null> {
    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!client) return null;
    const status = client.status === "ACTIVE" ? "active" : "inactive";
    return { id: client.id, status };
  },

  async findUserById(
    id: string,
  ): Promise<{
    id: string;
    status: "active" | "inactive";
    role: "admin" | "lawyer" | "assistant";
  } | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true, role: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      status: user.status === "ACTIVE" ? "active" : "inactive",
      role: user.role.toLowerCase() as "admin" | "lawyer" | "assistant",
    };
  },

  async findByCnjNumber(cnjNumber: string, excludeId?: string) {
    const item = await prisma.case.findFirst({
      where: { cnjNumber, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return item ? toCaseRecord(item as DbCase) : null;
  },

  async hasPendingFinance(caseId: string) {
    const count = await prisma.payment.count({
      where: { caseId, status: "PENDING" },
    });
    return count > 0;
  },

  async listDocumentStorageKeys(caseId: string) {
    const documents = await prisma.document.findMany({
      where: { caseId },
      select: { storageKey: true },
    });
    return documents.map((document) => document.storageKey);
  },

  async create(data: CreateCaseRecordData, payments: CreatePaymentData[]) {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.case.create({
        data: writeData(data) as Prisma.CaseUncheckedCreateInput,
      });
      await tx.payment.createMany({
        data: payments.map(writePayment) as Prisma.PaymentCreateManyInput[],
      });
      return created;
    });
    return toCaseRecord(item as DbCase);
  },

  async update(id: string, data: UpdateCaseInput) {
    const item = await prisma.case.update({
      where: { id },
      data: writeData(data) as Prisma.CaseUncheckedUpdateInput,
    });
    return toCaseRecord(item as DbCase);
  },

  async delete(id: string) {
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { caseId: id } }),
      prisma.caseSyncRun.deleteMany({ where: { caseId: id } }),
      prisma.caseDeadline.deleteMany({ where: { caseId: id } }),
      prisma.caseTimelineEvent.deleteMany({ where: { caseId: id } }),
      prisma.document.deleteMany({ where: { caseId: id } }),
      prisma.payment.deleteMany({ where: { caseId: id } }),
      prisma.caseImportItem.updateMany({ where: { caseId: id }, data: { caseId: null } }),
      prisma.case.delete({ where: { id } }),
    ]);
  },
};
