import { describe, expect, it } from "vitest";
import { createDeadlineSchema, listDeadlinesQuerySchema } from "./deadlines.schemas.js";

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
});
