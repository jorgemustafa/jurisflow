import { describe, expect, it } from "vitest";
import { courtCodeFromCnj, DataJudCourtUnsupportedError } from "./datajud-court.js";

describe("courtCodeFromCnj", () => {
  it("derives state court alias from CNJ (SP)", () => {
    // segment 8 (estadual), tribunal 26 (SP)
    expect(courtCodeFromCnj("0000001-23.2026.8.26.0000")).toBe("tjsp");
  });

  it("maps the federal district to tjdft", () => {
    expect(courtCodeFromCnj("00000012320268070000")).toBe("tjdft");
  });

  it("derives federal regional court alias", () => {
    // segment 4 (federal), region 03 -> trf3
    expect(courtCodeFromCnj("00000012320264030000")).toBe("trf3");
  });

  it("derives labor court alias and tst", () => {
    expect(courtCodeFromCnj("00000012320265020000")).toBe("trt2");
    expect(courtCodeFromCnj("00000012320265000000")).toBe("tst");
  });

  it("derives superior and military federal courts", () => {
    expect(courtCodeFromCnj("00000012320263000000")).toBe("stj");
    expect(courtCodeFromCnj("00000012320267000000")).toBe("stm");
  });

  it("rejects malformed CNJ numbers", () => {
    expect(() => courtCodeFromCnj("123")).toThrow(DataJudCourtUnsupportedError);
  });

  it("rejects unsupported segments", () => {
    // segment 1 (STF) is not exposed by the DataJud public API
    expect(() => courtCodeFromCnj("00000012320261000000")).toThrow(DataJudCourtUnsupportedError);
  });
});
