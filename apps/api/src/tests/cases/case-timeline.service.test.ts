import { describe, expect, it } from "vitest";
import type { CreateCaseTimelineEventInput } from "../../modules/cases/case-timeline.schemas.js";
import {
  CaseTimelineCaseNotFoundError,
  createCaseTimelineService,
  type CaseTimelineEventRecord
} from "../../modules/cases/case-timeline.service.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function eventRecord(overrides: Partial<CaseTimelineEventRecord> = {}): CaseTimelineEventRecord {
  return {
    id: "event-1",
    caseId: "case-1",
    createdByUserId: "user-1",
    createdByUserName: "Dra. Ana",
    externalSource: null,
    externalId: null,
    sourceHash: null,
    caseTitle: "Ação penal",
    clientName: "Ana Silva",
    type: "note",
    title: "Cliente enviou documentos",
    description: null,
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRepository() {
  const events: CaseTimelineEventRecord[] = [];

  return {
    async findCaseById(id: string) {
      return id === "case-1" ? { id } : null;
    },
    async list(caseId: string) {
      return events.filter((item) => item.caseId === caseId).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    },
    async listAll() {
      return [...events].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    },
    async create(caseId: string, data: CreateCaseTimelineEventInput & { occurredAt: Date }, createdByUserId: string | null) {
      const item = eventRecord({
        id: `event-${events.length + 1}`,
        caseId,
        createdByUserId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        occurredAt: data.occurredAt
      });
      events.push(item);
      return item;
    },
    seed(item: CaseTimelineEventRecord) {
      events.push(item);
    }
  };
}

describe("case timeline service", () => {
  it("creates an event for an existing case", async () => {
    const service = createCaseTimelineService(createRepository());

    const item = await service.create("case-1", { type: "hearing", title: "Audiência inicial", occurredAt: now }, "user-1");

    expect(item).toMatchObject({
      caseId: "case-1",
      createdByUserId: "user-1",
      type: "hearing",
      title: "Audiência inicial",
      occurredAt: now
    });
  });

  it("blocks events for missing cases", async () => {
    const service = createCaseTimelineService(createRepository());

    await expect(service.create("missing", { type: "note", title: "Andamento" }, "user-1")).rejects.toBeInstanceOf(CaseTimelineCaseNotFoundError);
  });

  it("lists events by most recent occurrence first", async () => {
    const repository = createRepository();
    repository.seed(eventRecord({ id: "old", occurredAt: new Date("2026-01-01T00:00:00.000Z") }));
    repository.seed(eventRecord({ id: "new", occurredAt: new Date("2026-02-01T00:00:00.000Z") }));
    const service = createCaseTimelineService(repository);

    await expect(service.list("case-1")).resolves.toMatchObject([{ id: "new" }, { id: "old" }]);
  });

  it("lists all timeline events across cases", async () => {
    const repository = createRepository();
    repository.seed(eventRecord({ id: "case-1-event", caseId: "case-1", occurredAt: new Date("2026-01-01T00:00:00.000Z") }));
    repository.seed(eventRecord({ id: "case-2-event", caseId: "case-2", occurredAt: new Date("2026-03-01T00:00:00.000Z") }));
    const service = createCaseTimelineService(repository);

    await expect(service.listAll({ type: "all" })).resolves.toMatchObject([{ id: "case-2-event" }, { id: "case-1-event" }]);
  });
});
