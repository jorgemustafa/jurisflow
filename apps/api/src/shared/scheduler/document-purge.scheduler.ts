import type { FastifyBaseLogger } from "fastify";
import { getDocumentStorage } from "../../modules/documents/document-storage.js";
import { documentsRepository } from "../../modules/documents/documents.repository.js";
import { createDocumentsService } from "../../modules/documents/documents.service.js";

export function startDailyDocumentPurgeScheduler(logger: FastifyBaseLogger) {
  if (process.env.ENABLE_DOCUMENT_PURGE === "false") return;

  const run = async () => {
    try {
      const service = createDocumentsService(documentsRepository, await getDocumentStorage());
      const { purged, failed } = await service.purge();
      if (purged) logger.info({ purged }, "Expired documents permanently deleted");
      if (failed) logger.error({ failed }, "Expired documents could not be deleted");
    } catch (error) {
      logger.error(error, "Document purge failed");
    }
  };

  void run();
  const timer = setInterval(() => void run(), 86_400_000);
  timer.unref();
}
