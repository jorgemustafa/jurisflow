import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { getDocumentStorage } from "./document-storage.js";
import { documentsRepository } from "./documents.repository.js";
import { createDocumentSchema, listDocumentsQuerySchema } from "./documents.schemas.js";
import { createDocumentsService, documentMaxSizeBytes, DocumentCaseError, DocumentClientError, DocumentFileError, DocumentNotFoundError } from "./documents.service.js";

const maxFileSize = documentMaxSizeBytes();

function handleDocumentError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid document data", issues: error.issues });
  if (error instanceof DocumentClientError) return reply.code(400).send({ message: error.message, field: "clientId" });
  if (error instanceof DocumentCaseError) return reply.code(400).send({ message: error.message, field: "caseId" });
  if (error instanceof DocumentFileError) return reply.code(400).send({ message: error.message, field: "file" });
  if (error instanceof DocumentNotFoundError) return reply.code(404).send({ message: error.message });
  throw error;
}

function disposition(type: "inline" | "attachment", filename: string) {
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename*=UTF-8''${encoded}`;
}

export async function documentsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());
  let service: ReturnType<typeof createDocumentsService> | undefined;
  const getService = async () => service ??= createDocumentsService(documentsRepository, await getDocumentStorage(), maxFileSize);

  app.get("/", async (request, reply) => {
    try { return await (await getService()).list(listDocumentsQuerySchema.parse(request.query)); }
    catch (error) { return handleDocumentError(error, reply); }
  });

  app.post("/", async (request, reply) => {
    try {
      const fields: Record<string, string> = {};
      let file: { originalName: string; mimeType: string; body: Buffer } | undefined;
      for await (const part of request.parts()) {
        if (part.type === "file") file = { originalName: part.filename, mimeType: part.mimetype, body: await part.toBuffer() };
        else fields[part.fieldname] = String(part.value);
      }
      if (!file) throw new DocumentFileError("Document file is required");
      const metadata = createDocumentSchema.parse({ ...fields, caseId: fields.caseId || undefined });
      const item = await (await getService()).upload({ ...metadata, ...file, uploadedByUserId: request.user!.id });
      return reply.code(201).send(item);
    } catch (error) { return handleDocumentError(error, reply); }
  });

  app.get("/:id/content", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { item, file } = await (await getService()).content(id);
      const inline = item.mimeType === "application/pdf" || item.mimeType.startsWith("image/");
      return reply.type(item.mimeType).header("Content-Disposition", disposition(inline ? "inline" : "attachment", item.originalName)).send(file.body);
    } catch (error) { return handleDocumentError(error, reply); }
  });

  app.delete("/:id", async (request, reply) => {
    try {
      await (await getService()).remove((request.params as { id: string }).id);
      return reply.code(204).send();
    } catch (error) { return handleDocumentError(error, reply); }
  });
}
