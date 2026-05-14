import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type { CreateUserInput, UpdateUserInput, UserListFilters, UserRole, UserStatus } from "./users.schemas.js";
import type { UserRecord } from "./users.service.js";

type DbUserRole = "ADMIN" | "LAWYER" | "ASSISTANT";
type DbUserStatus = "ACTIVE" | "INACTIVE";

const toDbRole = (role: UserRole): DbUserRole => role.toUpperCase() as DbUserRole;
const toApiRole = (role: DbUserRole): UserRole => role.toLowerCase() as UserRole;
const toDbStatus = (status: UserStatus): DbUserStatus => status.toUpperCase() as DbUserStatus;
const toApiStatus = (status: DbUserStatus): UserStatus => status.toLowerCase() as UserStatus;

type DbUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  role: DbUserRole;
  status: DbUserStatus;
  createdAt: Date;
  updatedAt: Date;
};

function toUserRecord(user: DbUser): UserRecord {
  return {
    ...user,
    role: toApiRole(user.role),
    status: toApiStatus(user.status)
  };
}

function writeData(data: CreateUserInput | UpdateUserInput) {
  return {
    ...data,
    role: data.role ? toDbRole(data.role) : undefined,
    status: "status" in data && data.status ? toDbStatus(data.status) : undefined
  };
}

function listWhere(filters: UserListFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (filters.status !== "all") where.status = toDbStatus(filters.status);
  if (filters.role && filters.role !== "all") where.role = toDbRole(filters.role);
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } }
    ];
  }
  return where;
}

export const usersRepository = {
  async list(filters: UserListFilters) {
    const users = await prisma.user.findMany({ where: listWhere(filters), orderBy: { name: "asc" } });
    return users.map((user) => toUserRecord(user as DbUser));
  },

  async findById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toUserRecord(user as DbUser) : null;
  },

  async findByEmail(email: string, excludeId?: string) {
    const user = await prisma.user.findFirst({
      where: { email, ...(excludeId ? { id: { not: excludeId } } : {}) }
    });
    return user ? toUserRecord(user as DbUser) : null;
  },

  async create(data: CreateUserInput) {
    const user = await prisma.user.create({ data: writeData(data) as Prisma.UserUncheckedCreateInput });
    return toUserRecord(user as DbUser);
  },

  async update(id: string, data: UpdateUserInput) {
    const user = await prisma.user.update({ where: { id }, data: writeData(data) as Prisma.UserUncheckedUpdateInput });
    return toUserRecord(user as DbUser);
  }
};
