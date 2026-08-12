import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { DocumentStorage } from "./document-storage.js";
import {
  allowedDocumentMimeTypes,
  type CreateDocumentInput,
  type DocumentListFilters,
} from "./documents.schemas.js";

export const DOCUMENT_RETENTION_DAYS = 30;
export const DEFAULT_MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;

export function documentMaxSizeBytes(
  value = process.env.DOCUMENT_MAX_SIZE_BYTES,
) {
  const size = Number(value ?? DEFAULT_MAX_DOCUMENT_SIZE_BYTES);
  if (!Number.isSafeInteger(size) || size < 1)
    throw new Error("DOCUMENT_MAX_SIZE_BYTES must be a positive integer");
  return size;
}

export type DocumentRecord = {
  id: string;
  clientId: string;
  caseId: string | null;
  uploadedByUserId: string | null;
  name: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  deletedAt: Date | null;
  purgeAfter: Date | null;
  clientName: string | null;
  caseTitle: string | null;
  caseCnjNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UploadDocumentInput = CreateDocumentInput & {
  originalName: string;
  mimeType: string;
  body: Buffer;
  uploadedByUserId: string;
};

type CreateData = Omit<
  DocumentRecord,
  | "id"
  | "clientName"
  | "caseTitle"
  | "caseCnjNumber"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "purgeAfter"
>;

export type DocumentsRepository = {
  list(filters: DocumentListFilters): Promise<DocumentRecord[]>;
  findById(
    id: string,
    includeDeleted?: boolean,
  ): Promise<DocumentRecord | null>;
  findClientById(id: string): Promise<{ id: string } | null>;
  findCaseById(id: string): Promise<{ id: string; clientId: string } | null>;
  create(data: CreateData): Promise<DocumentRecord>;
  softDelete(
    id: string,
    deletedAt: Date,
    purgeAfter: Date,
  ): Promise<DocumentRecord | null>;
  findDueForPurge(now: Date): Promise<DocumentRecord[]>;
  hardDelete(id: string): Promise<void>;
};

export class DocumentClientError extends Error {
  constructor(message = "Client not found") {
    super(message);
  }
}
export class DocumentCaseError extends Error {
  constructor(message = "Case not found") {
    super(message);
  }
}
export class DocumentNotFoundError extends Error {
  constructor() {
    super("Document not found");
  }
}
export class DocumentFileError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const mimeExtensions: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

function hasValidSignature(mimeType: string, body: Buffer) {
  if (mimeType === "application/pdf")
    return body.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/jpeg")
    return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  if (mimeType === "image/png")
    return body
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (
    mimeType.endsWith("officedocument.wordprocessingml.document") ||
    mimeType.endsWith("spreadsheetml.sheet")
  )
    return body.subarray(0, 2).toString() === "PK";
  return body
    .subarray(0, 8)
    .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
}

export function validateDocumentFile(
  input: Pick<UploadDocumentInput, "originalName" | "mimeType" | "body">,
  maxSize: number,
) {
  if (
    !allowedDocumentMimeTypes.includes(
      input.mimeType as (typeof allowedDocumentMimeTypes)[number],
    )
  )
    throw new DocumentFileError("Unsupported document type");
  if (!input.body.length) throw new DocumentFileError("Document file is empty");
  if (input.body.length > maxSize)
    throw new DocumentFileError("Document file is too large");
  if (
    !mimeExtensions[input.mimeType]?.includes(
      extname(input.originalName).toLowerCase(),
    ) ||
    !hasValidSignature(input.mimeType, input.body)
  )
    throw new DocumentFileError("Document content does not match its type");
}

export function createDocumentsService(
  repository: DocumentsRepository,
  storage: DocumentStorage,
  maxSize = DEFAULT_MAX_DOCUMENT_SIZE_BYTES,
) {
  async function ensureRelations(input: CreateDocumentInput) {
    if (!(await repository.findClientById(input.clientId)))
      throw new DocumentClientError();
    if (!input.caseId) return;
    const legalCase = await repository.findCaseById(input.caseId);
    if (!legalCase) throw new DocumentCaseError();
    if (legalCase.clientId !== input.clientId)
      throw new DocumentCaseError("Case must belong to the selected client");
  }

  return {
    list: (filters: DocumentListFilters) => repository.list(filters),

    async upload(input: UploadDocumentInput) {
      await ensureRelations(input);
      validateDocumentFile(input, maxSize);
      const extension = extname(input.originalName).toLowerCase();
      const storageKey = `${input.clientId}/${randomUUID()}${extension}`;
      const checksumSha256 = createHash("sha256")
        .update(input.body)
        .digest("hex");
      await storage.put(storageKey, input.body, input.mimeType);
      try {
        return await repository.create({
          clientId: input.clientId,
          caseId: input.caseId ?? null,
          uploadedByUserId: input.uploadedByUserId,
          name: input.name,
          originalName: input.originalName,
          storageKey,
          mimeType: input.mimeType,
          sizeBytes: input.body.length,
          checksumSha256,
        });
      } catch (error) {
        await storage.delete(storageKey);
        throw error;
      }
    },

    async content(id: string) {
      const item = await repository.findById(id);
      if (!item) throw new DocumentNotFoundError();
      return { item, file: await storage.get(item.storageKey) };
    },

    async remove(id: string, now = new Date()) {
      const purgeAfter = new Date(
        now.getTime() + DOCUMENT_RETENTION_DAYS * 86_400_000,
      );
      const item = await repository.softDelete(id, now, purgeAfter);
      if (!item) throw new DocumentNotFoundError();
      return item;
    },

    async purge(now = new Date()) {
      const due = await repository.findDueForPurge(now);
      let purged = 0;
      let failed = 0;
      for (const item of due) {
        try {
          await storage.delete(item.storageKey);
          await repository.hardDelete(item.id);
          purged++;
        } catch {
          failed++;
        }
      }
      return { purged, failed };
    },
  };
}
