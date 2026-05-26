import type { CreateDeadlineInput, DeadlineListFilters, DeadlineStatus, UpdateDeadlineInput } from "./deadlines.schemas.js";

export type DeadlineAlertLevel = "overdue" | "due_soon" | "none";

export type DeadlineRecord = {
  id: string;
  caseId: string;
  caseTitle: string | null;
  clientName: string | null;
  title: string;
  description: string | null;
  dueAt: Date;
  status: DeadlineStatus;
  completedAt: Date | null;
  alertLevel: DeadlineAlertLevel;
  createdAt: Date;
  updatedAt: Date;
};

type DeadlinesRepository = {
  findCaseById(id: string): Promise<{ id: string } | null>;
  findById(id: string): Promise<DeadlineRecord | null>;
  list(filters: DeadlineListFilters): Promise<DeadlineRecord[]>;
  create(caseId: string, data: CreateDeadlineInput): Promise<DeadlineRecord>;
  update(id: string, data: UpdateDeadlineInput): Promise<DeadlineRecord>;
  updateStatus(id: string, status: DeadlineStatus, completedAt: Date | null): Promise<DeadlineRecord>;
};

export class DeadlineCaseNotFoundError extends Error {
  constructor() {
    super("Case not found");
  }
}

export class DeadlineNotFoundError extends Error {
  constructor() {
    super("Deadline not found");
  }
}

function alertLevel(dueAt: Date, status: DeadlineStatus, alertWindowDays: number, now = new Date()): DeadlineAlertLevel {
  if (status !== "pending") return "none";
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(dueAt.getUTCFullYear(), dueAt.getUTCMonth(), dueAt.getUTCDate());
  if (due < today) return "overdue";
  if (due <= today + alertWindowDays * 24 * 60 * 60 * 1000) return "due_soon";
  return "none";
}

function withAlerts(items: DeadlineRecord[], alertWindowDays: number) {
  return items.map((item) => ({ ...item, alertLevel: alertLevel(item.dueAt, item.status, alertWindowDays) }));
}

export function createDeadlinesService(repository: DeadlinesRepository) {
  return {
    async list(filters: DeadlineListFilters) {
      return withAlerts(await repository.list(filters), filters.alertWindowDays);
    },

    async create(caseId: string, input: CreateDeadlineInput) {
      const legalCase = await repository.findCaseById(caseId);
      if (!legalCase) throw new DeadlineCaseNotFoundError();
      return repository.create(caseId, input);
    },

    async update(id: string, input: UpdateDeadlineInput) {
      const current = await repository.findById(id);
      if (!current) throw new DeadlineNotFoundError();
      return repository.update(id, input);
    },

    async updateStatus(id: string, status: DeadlineStatus) {
      const current = await repository.findById(id);
      if (!current) throw new DeadlineNotFoundError();
      return repository.updateStatus(id, status, status === "done" ? new Date() : null);
    }
  };
}
