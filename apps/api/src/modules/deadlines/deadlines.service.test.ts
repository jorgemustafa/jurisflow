import { describe, expect, it, vi } from "vitest";
import type { CreateDeadlineInput, DeadlineListFilters, DeadlineStatus, UpdateDeadlineInput } from "./deadlines.schemas.js";
import { createDeadlinesService, DeadlineCaseNotFoundError, DeadlineNotFoundError, type DeadlineRecord } from "./deadlines.service.js";

const now = new Date("2026-05-25T12:00:00.000Z");

function deadlineRecord(overrides: Partial<DeadlineRecord> = {}): DeadlineRecord {
  return {
    id: "deadline-1",
    caseId: "case-1",
    caseTitle: "Ação penal",
    clientName: "Ana Silva",
    title: "Protocolar recurso",
    description: null,
    dueAt: new Date("2026-05-28T00:00:00.000Z"),
    status: "pending",
    completedAt: null,
    alertLevel: "none",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRepository() {
  const deadlines: DeadlineRecord[] = [];

  return {
    async findCaseById(id: string) {
      return id === "case-1" ? { id } : null;
    },
    async findById(id: string) {
      return deadlines.find((item) => item.id === id) ?? null;
    },
    async list(filters: DeadlineListFilters) {
      return deadlines.filter((item) => filters.status === "all" || item.status === filters.status);
    },
    async create(caseId: string, data: CreateDeadlineInput) {
      const item = deadlineRecord({ id: `deadline-${deadlines.length + 1}`, caseId, ...data });
      deadlines.push(item);
      return item;
    },
    async update(id: string, data: UpdateDeadlineInput) {
      const item = deadlines.find((current) => current.id === id);
      if (!item) throw new Error("test setup error");
      Object.assign(item, data);
      return item;
    },
    async updateStatus(id: string, status: DeadlineStatus, completedAt: Date | null) {
      const item = deadlines.find((current) => current.id === id);
      if (!item) throw new Error("test setup error");
      Object.assign(item, { status, completedAt });
      return item;
    },
    seed(item: DeadlineRecord) {
      deadlines.push(item);
    }
  };
}

describe("deadlines service", () => {
  it("creates deadlines for existing cases", async () => {
    const service = createDeadlinesService(createRepository());

    const item = await service.create("case-1", { title: "Protocolar recurso", dueAt: new Date("2026-05-28T00:00:00.000Z") });

    expect(item).toMatchObject({ caseId: "case-1", title: "Protocolar recurso", status: "pending" });
  });

  it("blocks deadlines for missing cases", async () => {
    const service = createDeadlinesService(createRepository());

    await expect(service.create("missing", { title: "Prazo", dueAt: now })).rejects.toBeInstanceOf(DeadlineCaseNotFoundError);
  });

  it("computes overdue and due-soon alerts for pending deadlines", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const repository = createRepository();
    repository.seed(deadlineRecord({ id: "overdue", dueAt: new Date("2026-05-24T00:00:00.000Z") }));
    repository.seed(deadlineRecord({ id: "soon", dueAt: new Date("2026-05-28T00:00:00.000Z") }));
    repository.seed(deadlineRecord({ id: "later", dueAt: new Date("2026-06-20T00:00:00.000Z") }));
    const service = createDeadlinesService(repository);

    await expect(service.list({ status: "pending", alertWindowDays: 7 })).resolves.toMatchObject([
      { id: "overdue", alertLevel: "overdue" },
      { id: "soon", alertLevel: "due_soon" },
      { id: "later", alertLevel: "none" }
    ]);
    vi.useRealTimers();
  });

  it("marks done deadlines with completion time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const repository = createRepository();
    repository.seed(deadlineRecord());
    const service = createDeadlinesService(repository);

    const item = await service.updateStatus("deadline-1", "done");

    expect(item).toMatchObject({ status: "done", completedAt: now });
    vi.useRealTimers();
  });

  it("clears completion time when deadline status is no longer done", async () => {
    const repository = createRepository();
    repository.seed(deadlineRecord({ status: "done", completedAt: now }));
    const service = createDeadlinesService(repository);

    const item = await service.updateStatus("deadline-1", "canceled");

    expect(item).toMatchObject({ status: "canceled", completedAt: null });
  });

  it("updates deadline fields without changing completion state", async () => {
    const repository = createRepository();
    repository.seed(deadlineRecord({ status: "done", completedAt: now }));
    const service = createDeadlinesService(repository);

    const item = await service.update("deadline-1", {
      title: "Conferir publicação",
      description: "Revisar teor da intimação",
      dueAt: new Date("2026-06-02T00:00:00.000Z")
    });

    expect(item).toMatchObject({
      title: "Conferir publicação",
      description: "Revisar teor da intimação",
      dueAt: new Date("2026-06-02T00:00:00.000Z"),
      status: "done",
      completedAt: now
    });
  });

  it("rejects status updates for missing deadlines", async () => {
    const service = createDeadlinesService(createRepository());

    await expect(service.updateStatus("missing", "done")).rejects.toBeInstanceOf(DeadlineNotFoundError);
  });

  it("rejects field updates for missing deadlines", async () => {
    const service = createDeadlinesService(createRepository());

    await expect(service.update("missing", { title: "Novo prazo" })).rejects.toBeInstanceOf(DeadlineNotFoundError);
  });
});
