import { prisma } from "../../shared/db/prisma.js";
import type { CreateClientInput } from "./clients.schemas.js";

export const clientsRepository = {
  list() {
    return prisma.client.findMany({ orderBy: { createdAt: "desc" } });
  },

  create(data: CreateClientInput) {
    return prisma.client.create({ data });
  }
};
