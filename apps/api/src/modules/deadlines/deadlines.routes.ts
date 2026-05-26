import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { parseBody } from "../../shared/http/validate.js";
import { deadlinesRepository } from "./deadlines.repository.js";
import {
  caseDeadlineParamsSchema,
  createDeadlineSchema,
  deadlineParamsSchema,
  listDeadlinesQuerySchema,
  updateDeadlineSchema,
  updateDeadlineStatusSchema
} from "./deadlines.schemas.js";
import { createDeadlinesService, DeadlineCaseNotFoundError, DeadlineNotFoundError } from "./deadlines.service.js";

const deadlinesService = createDeadlinesService(deadlinesRepository);

function handleDeadlineError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid deadline data", issues: error.issues });
  if (error instanceof DeadlineCaseNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof DeadlineNotFoundError) return reply.code(404).send({ message: error.message });
  throw error;
}

export async function deadlinesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());

  app.get("/deadlines", async (request, reply) => {
    try {
      return deadlinesService.list(listDeadlinesQuerySchema.parse(request.query));
    } catch (error) {
      return handleDeadlineError(error, reply);
    }
  });

  app.post("/cases/:id/deadlines", async (request, reply) => {
    try {
      const { id } = caseDeadlineParamsSchema.parse(request.params);
      const item = await deadlinesService.create(id, parseBody(createDeadlineSchema, request.body));
      return reply.code(201).send(item);
    } catch (error) {
      return handleDeadlineError(error, reply);
    }
  });

  app.patch("/deadlines/:id/status", async (request, reply) => {
    try {
      const { id } = deadlineParamsSchema.parse(request.params);
      const { status } = parseBody(updateDeadlineStatusSchema, request.body);
      return deadlinesService.updateStatus(id, status);
    } catch (error) {
      return handleDeadlineError(error, reply);
    }
  });

  app.patch("/deadlines/:id", async (request, reply) => {
    try {
      const { id } = deadlineParamsSchema.parse(request.params);
      return deadlinesService.update(id, parseBody(updateDeadlineSchema, request.body));
    } catch (error) {
      return handleDeadlineError(error, reply);
    }
  });
}
