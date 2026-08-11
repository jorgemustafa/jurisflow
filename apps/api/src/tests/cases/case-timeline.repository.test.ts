import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("../../shared/db/prisma.js", () => ({
  prisma: { caseTimelineEvent: { findMany: db.findMany } },
}));

import { caseTimelineRepository } from "../../modules/cases/case-timeline.repository.js";

describe("case timeline repository", () => {
  it("filters the global timeline by CNJ", async () => {
    db.findMany.mockResolvedValueOnce([]);

    await caseTimelineRepository.listAll({
      type: "all",
      cnjNumber: "00003962420188260041",
    });

    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case: { cnjNumber: { contains: "00003962420188260041" } } },
      }),
    );
  });
});
