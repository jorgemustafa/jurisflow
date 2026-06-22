import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { parseBody } from "../../shared/http/validate.js";
import { caseTimelineRepository } from "./case-timeline.repository.js";
import { createCaseTimelineEventSchema } from "./case-timeline.schemas.js";
import { CaseTimelineCaseNotFoundError, createCaseTimelineService } from "./case-timeline.service.js";
import { caseImportRepository } from "./case-import.repository.js";
import { confirmCaseImportSchema, previewCaseImportSchema } from "./case-import.schemas.js";
import { CaseImportClientError, CaseImportDuplicateError, createCaseImportService } from "./case-import.service.js";
import { caseImportBatchRepository } from "./case-import-batch.repository.js";
import {
  caseImportBatchParamsSchema,
  caseImportItemParamsSchema,
  createCaseImportBatchSchema,
  updateCaseImportItemSchema
} from "./case-import-batch.schemas.js";
import {
  CaseImportBatchEmptyError,
  CaseImportBatchNotFoundError,
  CaseImportBatchStateError,
  CaseImportItemNotFoundError,
  CaseImportItemStateError,
  createCaseImportBatchService
} from "./case-import-batch.service.js";
import { caseParamsSchema, createCaseSchema, listCasesQuerySchema, updateCaseSchema } from "./cases.schemas.js";
import { casesRepository } from "./cases.repository.js";
import { caseSyncRepository } from "./case-sync.repository.js";
import { CaseSyncCaseNotFoundError, CaseSyncMissingCnjError, createCaseSyncService } from "./case-sync.service.js";
import { DataJudCaseNotFoundError, DataJudConfigError, DataJudRequestError, fetchDataJudCase } from "./datajud.client.js";
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
const timelineService = createCaseTimelineService(caseTimelineRepository);
const caseImportService = createCaseImportService(caseImportRepository, { fetchCase: fetchDataJudCase });
const caseImportBatchService = createCaseImportBatchService(caseImportBatchRepository, { fetchCase: fetchDataJudCase });
const caseSyncService = createCaseSyncService(caseSyncRepository, { fetchCase: fetchDataJudCase });

function handleCaseError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid case data", issues: error.issues });
  if (error instanceof CaseNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof CaseTimelineCaseNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof CaseClientError) return reply.code(400).send({ message: error.message, field: "clientId" });
  if (error instanceof CaseResponsibleUserError) return reply.code(400).send({ message: error.message, field: "responsibleUserId" });
  if (error instanceof CaseCnjConflictError) return reply.code(409).send({ message: error.message, field: "cnjNumber" });
  if (error instanceof CaseCnjTypeError) return reply.code(400).send({ message: error.message, field: "cnjNumber" });
  if (error instanceof CasePendingFinanceError) return reply.code(409).send({ message: error.message, field: "status" });
  if (error instanceof CaseImportClientError) return reply.code(400).send({ message: error.message, field: "clientId" });
  if (error instanceof CaseImportBatchNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof CaseImportItemNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof CaseImportBatchStateError) return reply.code(409).send({ message: error.message });
  if (error instanceof CaseImportItemStateError) return reply.code(409).send({ message: error.message });
  if (error instanceof CaseImportBatchEmptyError) return reply.code(400).send({ message: error.message });
  if (error instanceof CaseSyncCaseNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof CaseSyncMissingCnjError) return reply.code(409).send({ message: error.message, field: "cnjNumber" });
  if (error instanceof CaseImportDuplicateError) {
    return reply.code(409).send({ message: error.message, field: "cnjNumber", existingCaseId: error.existingCase.id });
  }
  if (error instanceof DataJudConfigError) return reply.code(503).send({ message: error.message });
  if (error instanceof DataJudCaseNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof DataJudRequestError) return reply.code(502).send({ message: error.message });
  throw error;
}

export async function casesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());

  app.get("/", async (request, reply) => {
    try {
      return casesService.list(listCasesQuerySchema.parse(request.query));
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.post("/import/preview", async (request, reply) => {
    try {
      return caseImportService.preview(parseBody(previewCaseImportSchema, request.body));
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.post("/import", async (request, reply) => {
    try {
      const item = await caseImportService.confirm(parseBody(confirmCaseImportSchema, request.body));
      return reply.code(201).send(item);
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.get("/import/batches", async (request, reply) => {
    try {
      return await caseImportBatchService.list();
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.post("/import/batches", async (request, reply) => {
    try {
      const batch = await caseImportBatchService.create(parseBody(createCaseImportBatchSchema, request.body));
      return reply.code(201).send(batch);
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.get("/import/batches/:batchId", async (request, reply) => {
    try {
      const { batchId } = caseImportBatchParamsSchema.parse(request.params);
      return await caseImportBatchService.get(batchId);
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.patch("/import/batches/:batchId/items/:itemId", async (request, reply) => {
    try {
      const { batchId, itemId } = caseImportItemParamsSchema.parse(request.params);
      return await caseImportBatchService.updateItem(batchId, itemId, parseBody(updateCaseImportItemSchema, request.body));
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.post("/import/batches/:batchId/confirm", async (request, reply) => {
    try {
      const { batchId } = caseImportBatchParamsSchema.parse(request.params);
      return await caseImportBatchService.confirm(batchId);
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.post("/sync", async (request, reply) => {
    try {
      return await caseSyncService.syncAllActive({ trigger: "manual", triggeredByUserId: request.user?.id ?? null });
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.post("/:id/sync", async (request, reply) => {
    try {
      const { id } = caseParamsSchema.parse(request.params);
      return await caseSyncService.syncCase(id, { trigger: "manual", triggeredByUserId: request.user?.id ?? null });
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.get("/:id/sync-runs", async (request, reply) => {
    try {
      const { id } = caseParamsSchema.parse(request.params);
      return await caseSyncService.listRuns(id);
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

  app.get("/:id/timeline", async (request, reply) => {
    try {
      const { id } = caseParamsSchema.parse(request.params);
      return timelineService.list(id);
    } catch (error) {
      return handleCaseError(error, reply);
    }
  });

  app.post("/:id/timeline", async (request, reply) => {
    try {
      const { id } = caseParamsSchema.parse(request.params);
      const item = await timelineService.create(id, parseBody(createCaseTimelineEventSchema, request.body), request.user?.id ?? null);
      return reply.code(201).send(item);
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
