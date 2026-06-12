import { describe, expect, it } from "vitest";
import { deriveCourtFromCnj, formatCnjNumber } from "./cnj.js";

describe("deriveCourtFromCnj", () => {
  it("derives state courts (segment 8)", () => {
    expect(deriveCourtFromCnj("00000012320268260000")).toEqual({ code: "tjsp", label: "TJSP" });
    expect(deriveCourtFromCnj("0000001-23.2026.8.19.0001")).toEqual({ code: "tjrj", label: "TJRJ" });
    expect(deriveCourtFromCnj("00000012320268070000")).toEqual({ code: "tjdft", label: "TJDFT" });
  });

  it("derives federal and labor courts", () => {
    expect(deriveCourtFromCnj("00000012320264030000")).toEqual({ code: "trf3", label: "TRF3" });
    expect(deriveCourtFromCnj("00000012320265150000")).toEqual({ code: "trt15", label: "TRT15" });
    expect(deriveCourtFromCnj("00000012320265000000")).toEqual({ code: "tst", label: "TST" });
  });

  it("derives superior, electoral and military courts", () => {
    expect(deriveCourtFromCnj("00000012320263000000")).toEqual({ code: "stj", label: "STJ" });
    expect(deriveCourtFromCnj("00000012320266260000")).toEqual({ code: "tre-sp", label: "TRE-SP" });
    expect(deriveCourtFromCnj("00000012320267000000")).toEqual({ code: "stm", label: "STM" });
    expect(deriveCourtFromCnj("00000012320269130000")).toEqual({ code: "tjmmg", label: "TJMMG" });
  });

  it("returns null for unsupported or invalid numbers", () => {
    expect(deriveCourtFromCnj("123")).toBeNull();
    expect(deriveCourtFromCnj("00000012320261000000")).toBeNull();
    expect(deriveCourtFromCnj("00000012320268990000")).toBeNull();
    expect(deriveCourtFromCnj("00000012320264070000")).toBeNull();
  });
});

describe("formatCnjNumber", () => {
  it("formats 20-digit numbers in the CNJ mask", () => {
    expect(formatCnjNumber("00000012320268260000")).toBe("0000001-23.2026.8.26.0000");
  });

  it("returns the original value when it does not have 20 digits", () => {
    expect(formatCnjNumber("123")).toBe("123");
  });
});
