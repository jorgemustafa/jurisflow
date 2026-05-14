import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type { ClientListFilters, ClientStatus, ClientType, CreateClientInput, UpdateClientInput } from "./clients.schemas.js";
import type { ClientRecord } from "./clients.service.js";

type DbClientType = "INDIVIDUAL" | "COMPANY";
type DbClientStatus = "ACTIVE" | "INACTIVE";

const toDbType = (type: ClientType): DbClientType => (type === "individual" ? "INDIVIDUAL" : "COMPANY");
const toApiType = (type: DbClientType): ClientType => (type === "INDIVIDUAL" ? "individual" : "company");
const toDbStatus = (status: ClientStatus): DbClientStatus => (status === "active" ? "ACTIVE" : "INACTIVE");
const toApiStatus = (status: DbClientStatus): ClientStatus => (status === "ACTIVE" ? "active" : "inactive");
const digits = (value: string) => value.replace(/\D/g, "");

type DbClient = {
  id: string;
  type: DbClientType;
  status: DbClientStatus;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toClientRecord(client: DbClient): ClientRecord {
  return {
    ...client,
    type: toApiType(client.type),
    status: toApiStatus(client.status)
  };
}

function writeData(data: CreateClientInput | UpdateClientInput) {
  return {
    ...data,
    type: data.type ? toDbType(data.type) : undefined
  };
}

function listWhere(filters: ClientListFilters): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = {};

  if (filters.status !== "all") where.status = toDbStatus(filters.status);
  if (filters.type && filters.type !== "all") where.type = toDbType(filters.type);

  if (filters.q) {
    const qDigits = digits(filters.q);
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      ...(qDigits ? [{ document: { contains: qDigits } }, { phone: { contains: qDigits } }] : [])
    ];
  }

  return where;
}

export const clientsRepository = {
  async list(filters: ClientListFilters) {
    const clients = await prisma.client.findMany({
      where: listWhere(filters),
      orderBy: { updatedAt: "desc" }
    });
    return clients.map((client) => toClientRecord(client as DbClient));
  },

  async findById(id: string) {
    const client = await prisma.client.findUnique({ where: { id } });
    return client ? toClientRecord(client as DbClient) : null;
  },

  async findByDocument(document: string, excludeId?: string) {
    const client = await prisma.client.findFirst({
      where: { document, ...(excludeId ? { id: { not: excludeId } } : {}) }
    });
    return client ? toClientRecord(client as DbClient) : null;
  },

  async create(data: CreateClientInput) {
    const client = await prisma.client.create({ data: writeData(data) as Prisma.ClientUncheckedCreateInput });
    return toClientRecord(client as DbClient);
  },

  async update(id: string, data: UpdateClientInput) {
    const client = await prisma.client.update({ where: { id }, data: writeData(data) as Prisma.ClientUncheckedUpdateInput });
    return toClientRecord(client as DbClient);
  },

  async updateStatus(id: string, status: ClientStatus) {
    const client = await prisma.client.update({ where: { id }, data: { status: toDbStatus(status) } });
    return toClientRecord(client as DbClient);
  }
};
