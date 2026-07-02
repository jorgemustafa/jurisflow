import { describe, expect, it } from "vitest";
import {
  createCaseTimelineEventSchema,
  listCaseTimelineQuerySchema
} from "../../modules/cases/case-timeline.schemas.js";

describe("case timeline schemas", () => {
  it("accepts a minimal timeline event", () => {
    const input = createCaseTimelineEventSchema.parse({
      type: "note",
      title: "Cliente enviou documentos"
    });

    expect(input).toEqual({
      type: "note",
      title: "Cliente enviou documentos"
    });
  });

  it("normalizes optional description and event date", () => {
    const input = createCaseTimelineEventSchema.parse({
      type: "hearing",
      title: " Audiência inicial ",
      description: "",
      occurredAt: "2026-05-25"
    });

    expect(input).toEqual({
      type: "hearing",
      title: "Audiência inicial",
      description: undefined,
      occurredAt: new Date("2026-05-25T00:00:00.000Z")
    });
  });

  it("defaults global timeline listing to all event types", () => {
    expect(listCaseTimelineQuerySchema.parse({})).toEqual({ type: "all" });
  });
});
