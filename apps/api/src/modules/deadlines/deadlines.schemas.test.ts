import { describe, expect, it } from "vitest";
import { createDeadlineSchema, listDeadlinesQuerySchema, updateDeadlineSchema } from "./deadlines.schemas.js";

describe("deadline schemas", () => {
  it("accepts valid deadline creation input", () => {
    const input = createDeadlineSchema.parse({
      title: " Protocolar recurso ",
      description: "",
      dueAt: "2026-05-30"
    });

    expect(input).toEqual({
      title: "Protocolar recurso",
      description: undefined,
      dueAt: new Date("2026-05-30T00:00:00.000Z")
    });
  });

  it("defaults listing to pending deadlines with seven-day alert window", () => {
    expect(listDeadlinesQuerySchema.parse({})).toEqual({ status: "pending", alertWindowDays: 7 });
  });

  it("accepts partial deadline metadata updates and clears empty descriptions", () => {
    expect(updateDeadlineSchema.parse({ title: " Conferir publicação ", description: "", dueAt: "2026-06-01" })).toEqual({
      title: "Conferir publicação",
      description: null,
      dueAt: new Date("2026-06-01T00:00:00.000Z")
    });
  });
});
