import type { CaseTimelineEventType, CreateCaseTimelineEventInput } from "./case-timeline.schemas.js";

export type CaseTimelineEventRecord = {
  id: string;
  caseId: string;
  createdByUserId: string | null;
  createdByUserName: string | null;
  type: CaseTimelineEventType;
  title: string;
  description: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type CaseTimelineRepository = {
  findCaseById(id: string): Promise<{ id: string } | null>;
  list(caseId: string): Promise<CaseTimelineEventRecord[]>;
  create(caseId: string, data: CreateCaseTimelineEventInput & { occurredAt: Date }, createdByUserId: string | null): Promise<CaseTimelineEventRecord>;
};

export class CaseTimelineCaseNotFoundError extends Error {
  constructor() {
    super("Case not found");
  }
}

export function createCaseTimelineService(repository: CaseTimelineRepository) {
  async function ensureCase(caseId: string) {
    const item = await repository.findCaseById(caseId);
    if (!item) throw new CaseTimelineCaseNotFoundError();
  }

  return {
    async list(caseId: string) {
      await ensureCase(caseId);
      return repository.list(caseId);
    },

    async create(caseId: string, input: CreateCaseTimelineEventInput, createdByUserId: string | null) {
      await ensureCase(caseId);
      return repository.create(caseId, { ...input, occurredAt: input.occurredAt ?? new Date() }, createdByUserId);
    }
  };
}
