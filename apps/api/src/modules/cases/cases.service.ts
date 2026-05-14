import type { CaseListFilters, CaseStage, CaseStatus, CaseType, CreateCaseInput, LegalArea, UpdateCaseInput } from "./cases.schemas.js";

export type CaseRecord = {
  id: string;
  clientId: string;
  responsibleUserId: string | null;
  caseType: CaseType;
  title: string;
  cnjNumber: string | null;
  status: CaseStatus;
  stage: CaseStage | null;
  legalArea: LegalArea | null;
  opposingParty: string | null;
  court: string | null;
  jurisdiction: string | null;
  division: string | null;
  description: string | null;
  openedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ClientRef = { id: string; status: "active" | "inactive" };
type UserRef = { id: string; status: "active" | "inactive"; role: "admin" | "lawyer" | "assistant" };

type CasesRepository = {
  list(filters: CaseListFilters): Promise<CaseRecord[]>;
  findById(id: string): Promise<CaseRecord | null>;
  findClientById(id: string): Promise<ClientRef | null>;
  findUserById(id: string): Promise<UserRef | null>;
  findByCnjNumber(cnjNumber: string, excludeId?: string): Promise<CaseRecord | null>;
  hasPendingFinance(caseId: string): Promise<boolean>;
  create(data: CreateCaseInput): Promise<CaseRecord>;
  update(id: string, data: UpdateCaseInput): Promise<CaseRecord>;
};

export class CaseNotFoundError extends Error {
  constructor() {
    super("Case not found");
  }
}

export class CaseClientError extends Error {
  constructor(message = "Client is invalid for this case") {
    super(message);
  }
}

export class CaseResponsibleUserError extends Error {
  constructor() {
    super("Responsible user must be an active lawyer or admin");
  }
}

export class CaseCnjConflictError extends Error {
  constructor() {
    super("Case CNJ already exists");
  }
}

export class CaseCnjTypeError extends Error {
  constructor() {
    super("CNJ is only allowed for judicial cases");
  }
}

export class CasePendingFinanceError extends Error {
  constructor() {
    super("Case has pending finance");
  }
}

const isClosedStatus = (status: CaseStatus) => status === "closed" || status === "canceled";

export function createCasesService(repository: CasesRepository) {
  async function ensureActiveClient(clientId: string) {
    const client = await repository.findClientById(clientId);
    if (!client) throw new CaseClientError("Client not found");
    if (client.status !== "active") throw new CaseClientError("Client must be active");
  }

  async function ensureResponsibleUser(userId: string | null | undefined) {
    if (!userId) return;
    const user = await repository.findUserById(userId);
    if (!user || user.status !== "active" || !["lawyer", "admin"].includes(user.role)) {
      throw new CaseResponsibleUserError();
    }
  }

  async function ensureUniqueCnj(cnjNumber: string | null | undefined, excludeId?: string) {
    if (!cnjNumber) return;
    const existing = await repository.findByCnjNumber(cnjNumber, excludeId);
    if (existing) throw new CaseCnjConflictError();
  }

  function ensureCnjAllowed(caseType: CaseType, cnjNumber: string | null | undefined) {
    if (caseType === "extrajudicial" && cnjNumber) throw new CaseCnjTypeError();
  }

  return {
    list(filters: CaseListFilters) {
      return repository.list(filters);
    },

    async get(id: string) {
      const item = await repository.findById(id);
      if (!item) throw new CaseNotFoundError();
      return item;
    },

    async create(input: CreateCaseInput) {
      const data = {
        ...input,
        caseType: input.caseType ?? "judicial",
        status: input.status ?? "active"
      };

      await ensureActiveClient(input.clientId);
      await ensureResponsibleUser(input.responsibleUserId);
      await ensureUniqueCnj(input.cnjNumber);
      ensureCnjAllowed(data.caseType, input.cnjNumber);
      return repository.create(data);
    },

    async update(id: string, input: UpdateCaseInput) {
      const current = await repository.findById(id);
      if (!current) throw new CaseNotFoundError();

      if (input.clientId && input.clientId !== current.clientId) await ensureActiveClient(input.clientId);
      if (input.responsibleUserId !== undefined) await ensureResponsibleUser(input.responsibleUserId);

      const nextType = input.caseType ?? current.caseType;
      const nextCnj = input.cnjNumber === undefined ? current.cnjNumber : input.cnjNumber;

      ensureCnjAllowed(nextType, nextCnj);
      if (nextCnj !== current.cnjNumber) await ensureUniqueCnj(nextCnj, id);

      if (input.status && isClosedStatus(input.status) && !isClosedStatus(current.status) && (await repository.hasPendingFinance(id))) {
        throw new CasePendingFinanceError();
      }

      return repository.update(id, input);
    }
  };
}
