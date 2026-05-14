import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { parseBody } from "../../shared/http/validate.js";
import { caseParamsSchema, createCaseSchema, listCasesQuerySchema, updateCaseSchema } from "./cases.schemas.js";
import { casesRepository } from "./cases.repository.js";
import {
  CaseClientError,
  CaseCnjConflictError,
  CaseCnjTypeError,
  CaseNotFoundError,
  CasePendingFinanceError,
  CaseResponsibleUserError,
  createCasesService
} from "./cases.service.js";

const casesService = createCasesService(casesRepository);

function handleCaseError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid case data", issues: error.issues });
  if (error instanceof CaseNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof CaseClientError) return reply.code(400).send({ message: error.message, field: "clientId" });
  if (error instanceof CaseResponsibleUserError) return reply.code(400).send({ message: error.message, field: "responsibleUserId" });
  if (error instanceof CaseCnjConflictError) return reply.code(409).send({ message: error.message, field: "cnjNumber" });
  if (error instanceof CaseCnjTypeError) return reply.code(400).send({ message: error.message, field: "cnjNumber" });
  if (error instanceof CasePendingFinanceError) return reply.code(409).send({ message: error.message, field: "status" });
  throw error;
}

export async function casesRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    try {
      return casesService.list(listCasesQuerySchema.parse(request.query));
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = caseParamsSchema.parse(request.params);
      return casesService.get(id);
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const item = await casesService.create(parseBody(createCaseSchema, request.body));
      return reply.code(201).send(item);
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.patch("/:id", async (request, reply) => {
    try {
      const { id } = caseParamsSchema.parse(request.params);
      return casesService.update(id, parseBody(updateCaseSchema, request.body));
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });
}
