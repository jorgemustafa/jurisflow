import type { FastifyBaseLogger } from "fastify";
import { caseSyncRepository } from "../../modules/cases/case-sync.repository.js";
import { createCaseSyncService } from "../../modules/cases/case-sync.service.js";
import { fetchDataJudCase } from "../../modules/cases/datajud.client.js";

// Lightweight, dependency-free daily scheduler.
//
// Runs the DataJud sync for every active judicial case once per day at
// SYNC_DAILY_TIME (HH:MM, local time). Set ENABLE_SYNC_SCHEDULER=false to
// disable it (for example in tests or one-off jobs).

const caseSyncService = createCaseSyncService(caseSyncRepository, { fetchCase: fetchDataJudCase });

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDailyTime(value: string | undefined): { hour: number; minute: number } {
  const [rawHour, rawMinute] = (value ?? "06:00").split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const validHour = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 6;
  const validMinute = Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0;
  return { hour: validHour, minute: validMinute };
}

function msUntilNext(hour: number, minute: number, now = new Date()): number {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setTime(next.getTime() + DAY_IN_MS);
  return next.getTime() - now.getTime();
}

export async function runDailyCaseSync(logger: Pick<FastifyBaseLogger, "info" | "error">) {
  try {
    const result = await caseSyncService.syncAllActive({ trigger: "scheduled", triggeredByUserId: null });
    logger.info({ result }, "Daily case sync finished");
    return result;
  } catch (error) {
    logger.error({ err: error }, "Daily case sync failed");
    return null;
  }
}

export function startDailyCaseSyncScheduler(logger: Pick<FastifyBaseLogger, "info" | "error">) {
  if (process.env.ENABLE_SYNC_SCHEDULER === "false") {
    logger.info("Daily case sync scheduler disabled (ENABLE_SYNC_SCHEDULER=false)");
    return;
  }

  const { hour, minute } = parseDailyTime(process.env.SYNC_DAILY_TIME);

  const scheduleNext = () => {
    const delay = msUntilNext(hour, minute);
    logger.info({ nextRunInMinutes: Math.round(delay / 60000) }, "Daily case sync scheduled");

    const timer = setTimeout(async () => {
      await runDailyCaseSync(logger);
      scheduleNext();
    }, delay);

    timer.unref?.();
  };

  scheduleNext();
}
