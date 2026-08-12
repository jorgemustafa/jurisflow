import type {
  CaseTimelineEventType,
  CaseTimelineFilters,
  CreateCaseTimelineEventInput,
} from "./case-timeline.schemas.js";

export type CaseTimelineEventRecord = {
  id: string;
  caseId: string;
  createdByUserId: string | null;
  createdByUserName: string | null;
  externalSource: string | null;
  externalId: string | null;
  sourceHash: string | null;
  caseTitle: string | null;
  caseCnjNumber: string | null;
  clientName: string | null;
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
  listAll(filters: CaseTimelineFilters): Promise<CaseTimelineEventRecord[]>;
  create(
    caseId: string,
    data: CreateCaseTimelineEventInput & { occurredAt: Date },
    createdByUserId: string | null,
  ): Promise<CaseTimelineEventRecord>;
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

    listAll(filters: CaseTimelineFilters) {
      return repository.listAll(filters);
    },

    async create(
      caseId: string,
      input: CreateCaseTimelineEventInput,
      createdByUserId: string | null,
    ) {
      await ensureCase(caseId);
      return repository.create(
        caseId,
        { ...input, occurredAt: input.occurredAt ?? new Date() },
        createdByUserId,
      );
    },
  };
}
