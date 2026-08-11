import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDataJudCase } from "../../modules/cases/datajud.client.js";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DATAJUD_API_KEY;
});

describe("DataJud client", () => {
  it("uses only the process class as imported title", async () => {
    process.env.DATAJUD_API_KEY = "key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hits: {
            hits: [
              {
                _source: {
                  numeroProcesso: "00003962420188260041",
                  classe: { nome: "Execução da Pena" },
                },
              },
            ],
          },
        }),
      }),
    );

    await expect(
      fetchDataJudCase({
        cnjNumber: "00003962420188260041",
        courtCode: "tjsp",
      }),
    ).resolves.toMatchObject({
      title: "Execução da Pena",
    });
  });
});
