import type { CaseTimelineEventType } from "./case-timeline.schemas.js";
import type { CaseRecord } from "./cases.service.js";
import type {
  ConfirmCaseImportInput,
  PreviewCaseImportInput,
} from "./case-import.schemas.js";

export type ImportedMovement = {
  externalId: string;
  sourceHash: string;
  type: CaseTimelineEventType;
  title: string;
  description: string | null;
  occurredAt: Date;
};

export type ImportedCaseDraft = {
  cnjNumber: string;
  title: string;
  court: string | null;
  jurisdiction: string | null;
  division: string | null;
  description: string | null;
  openedAt: Date | null;
  movements: ImportedMovement[];
};

export type CaseImportCreation = {
  id: string;
  createdAt: Date;
  totalFeeAmountCents: number;
  payments: CreatePaymentData[];
};

type ClientRef = { id: string; status: "active" | "inactive" };

type CaseImportRepository = {
  findClientById(id: string): Promise<ClientRef | null>;
  findByCnjNumber(cnjNumber: string): Promise<CaseRecord | null>;
  importCase(
    clientId: string,
    draft: ImportedCaseDraft,
    creation: CaseImportCreation,
  ): Promise<{
    case: CaseRecord;
    importedMovements: number;
    skippedMovements: number;
  }>;
};

type CaseImportProvider = {
  fetchCase(input: PreviewCaseImportInput): Promise<ImportedCaseDraft>;
};

export class CaseImportDuplicateError extends Error {
  constructor(readonly existingCase: CaseRecord) {
    super("Case already imported");
  }
}

export class CaseImportClientError extends Error {
  constructor(message = "Client is invalid for this import") {
    super(message);
  }
}

function uniqueMovements(movements: ImportedMovement[]) {
  const seen = new Set<string>();
  const unique: ImportedMovement[] = [];

  for (const movement of movements) {
    if (seen.has(movement.sourceHash)) continue;
    seen.add(movement.sourceHash);
    unique.push(movement);
  }

  return unique;
}

export function prepareCaseImport(
  clientId: string,
  finance: CaseFinanceInput,
  createdAt: Date,
): CaseImportCreation {
  const id = randomUUID();
  return {
    id,
    createdAt,
    totalFeeAmountCents: finance.totalFeeAmountCents,
    payments: buildCasePayments(id, clientId, finance, createdAt),
  };
}

export function createCaseImportService(
  repository: CaseImportRepository,
  provider: CaseImportProvider,
  options: { now?: () => Date } = {},
) {
  const now = options.now ?? (() => new Date());
  async function findDuplicate(cnjNumber: string) {
    return repository.findByCnjNumber(cnjNumber);
  }

  async function ensureActiveClient(clientId: string) {
    const client = await repository.findClientById(clientId);
    if (!client) throw new CaseImportClientError("Client not found");
    if (client.status !== "active")
      throw new CaseImportClientError("Client must be active");
  }

  return {
    async preview(input: PreviewCaseImportInput) {
      const duplicate = await findDuplicate(input.cnjNumber);
      if (duplicate) return { draft: null, duplicate };

      const draft = await provider.fetchCase(input);
      return {
        draft: { ...draft, movements: uniqueMovements(draft.movements) },
        duplicate: null,
      };
    },

    async confirm(input: ConfirmCaseImportInput) {
      await ensureActiveClient(input.clientId);

      const duplicate = await findDuplicate(input.cnjNumber);
      if (duplicate) throw new CaseImportDuplicateError(duplicate);

      const draft = await provider.fetchCase(input);
      return repository.importCase(
        input.clientId,
        { ...draft, movements: uniqueMovements(draft.movements) },
        prepareCaseImport(input.clientId, input.finance, now()),
      );
    },
  };
}
import { randomUUID } from "node:crypto";
import type { CaseFinanceInput } from "@magistrum/shared";
import {
  buildCasePayments,
  type CreatePaymentData,
} from "../payments/payments.service.js";
