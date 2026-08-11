import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  caseCount: vi.fn(),
  paymentCount: vi.fn(),
  documentCount: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("../../shared/db/prisma.js", () => ({
  prisma: {
    $transaction: db.transaction,
    case: { count: db.caseCount },
    payment: { count: db.paymentCount },
    document: { count: db.documentCount }
  }
}));

import { clientsRepository } from "../../modules/clients/clients.repository.js";

describe("clients repository", () => {
  it("does not treat import items as a client deletion blocker", async () => {
    db.caseCount.mockResolvedValueOnce(0);
    db.paymentCount.mockResolvedValueOnce(0);
    db.documentCount.mockResolvedValueOnce(0);
    db.transaction.mockImplementationOnce((queries: Promise<number>[]) => Promise.all(queries));

    await expect(clientsRepository.countLinks("client-1")).resolves.toEqual([
      { label: "processos", count: 0 },
      { label: "pagamentos", count: 0 },
      { label: "documentos", count: 0 }
    ]);
  });
});
