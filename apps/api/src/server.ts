import { buildApp } from "./app.js";
import { startDailyCaseSyncScheduler } from "./shared/scheduler/case-sync.scheduler.js";
import { startDailyDocumentPurgeScheduler } from "./shared/scheduler/document-purge.scheduler.js";

const app = buildApp();
const port = Number(process.env.API_PORT ?? 3333);

try {
  await app.listen({ port, host: "0.0.0.0" });
  startDailyCaseSyncScheduler(app.log);
  startDailyDocumentPurgeScheduler(app.log);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
