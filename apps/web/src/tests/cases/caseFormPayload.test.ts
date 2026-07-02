import { describe, expect, it } from "vitest";
import {
  caseFormPayload,
  type CaseFormData,
} from "src/services/cases.js";

const form: CaseFormData = {
  clientId: "00000000-0000-0000-0000-000000000001",
  caseType: "judicial",
  title: "Processo sem classificação",
  cnjNumber: "",
  status: "active",
  stage: "",
  legalArea: "",
  opposingParty: "",
  court: "",
  jurisdiction: "",
  division: "",
  description: "",
  openedAt: "",
  closedAt: "",
};

describe("case form payload", () => {
  it("omits empty optional classifications when creating", () => {
    expect(JSON.parse(JSON.stringify(caseFormPayload(form, undefined)))).not.toHaveProperty(
      "stage",
    );
    expect(JSON.parse(JSON.stringify(caseFormPayload(form, undefined)))).not.toHaveProperty(
      "legalArea",
    );
  });

  it("clears empty optional classifications when updating", () => {
    expect(caseFormPayload(form, null)).toMatchObject({
      stage: null,
      legalArea: null,
    });
  });
});
