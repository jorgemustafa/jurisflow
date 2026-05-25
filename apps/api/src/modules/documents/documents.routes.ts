import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { parseBody } from "../../shared/http/validate.js";
import { documentsRepository } from "./documents.repository.js";
import { createDocumentSchema, listDocumentsQuerySchema } from "./documents.schemas.js";
import { createDocumentsService, DocumentCaseError, DocumentClientError } from "./documents.service.js";

const documentsService = createDocumentsService(documentsRepository);

function handleDocumentError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid document data", issues: error.issues });
  if (error instanceof DocumentClientError) return reply.code(400).send({ message: error.message, field: "clientId" });
  if (error instanceof DocumentCaseError) return reply.code(400).send({ message: error.message, field: "caseId" });
  throw error;
}

export async function documentsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());

  app.get("/", async (request, reply) => {
    try {
      return documentsService.list(listDocumentsQuerySchema.parse(request.query));
    } catch (error) {
      return handleDocumentError(error, reply);
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const item = await documentsService.create(parseBody(createDocumentSchema, request.body));
      return reply.code(201).send(item);
    } catch (error) {
      return handleDocumentError(error, reply);
    }
  });
}
