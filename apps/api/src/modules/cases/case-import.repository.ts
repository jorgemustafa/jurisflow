import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type { ImportedCaseDraft } from "./case-import.service.js";
import { casesRepository } from "./cases.repository.js";

export const caseImportRepository = {
  findClientById: casesRepository.findClientById,
  findByCnjNumber: casesRepository.findByCnjNumber,

  async importCase(clientId: string, draft: ImportedCaseDraft) {
    const imported = await prisma.$transaction(async (tx) => {
      const item = await tx.case.create({
        data: {
          clientId,
          caseType: "JUDICIAL",
          status: "ACTIVE",
          title: draft.title,
          cnjNumber: draft.cnjNumber,
          court: draft.court,
          jurisdiction: draft.jurisdiction,
          division: draft.division,
          description: draft.description,
          openedAt: draft.openedAt
        }
      });

      let movementCount = 0;
      if (draft.movements.length) {
        const result = await tx.caseTimelineEvent.createMany({
          data: draft.movements.map((movement) => ({
            caseId: item.id,
            externalSource: "datajud",
            externalId: movement.externalId,
            sourceHash: movement.sourceHash,
            type: movement.type.toUpperCase() as Prisma.CaseTimelineEventCreateManyInput["type"],
            title: movement.title,
            description: movement.description,
            occurredAt: movement.occurredAt
          })),
          skipDuplicates: true
        });
        movementCount = result.count;
      }

      return { item, movementCount };
    });

    return {
      case: await casesRepository.findById(imported.item.id).then((item) => {
        if (!item) throw new Error("Imported case not found");
        return item;
      }),
      importedMovements: imported.movementCount,
      skippedMovements: draft.movements.length - imported.movementCount
    };
  }
};
