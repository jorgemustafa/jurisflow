import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { financeRepository } from "./finance.repository.js";
import { financeDashboardQuerySchema } from "./finance.schemas.js";
import { createFinanceService } from "./finance.service.js";

const financeService = createFinanceService(financeRepository);

function handleFinanceError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid finance data", issues: error.issues });
  throw error;
}

export async function financeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());

  app.get("/finance/dashboard", async (request, reply) => {
    try {
      return await financeService.dashboard(financeDashboardQuerySchema.parse(request.query));
    } catch (error) {
      return handleFinanceError(error, reply);
    }
  });
}
