import { describe, expect, it } from "vitest";
import { createClientSchema, listClientsQuerySchema, updateClientSchema } from "../../modules/clients/clients.schemas.js";

describe("client schemas", () => {
  it("normalizes CPF, email, and phone", () => {
    const client = createClientSchema.parse({
      type: "individual",
      name: " Maria Silva ",
      document: "529.982.247-25",
      email: " MARIA@EMAIL.COM ",
      phone: "(11) 99999-9999"
    });

    expect(client).toMatchObject({
      type: "individual",
      name: "Maria Silva",
      document: "52998224725",
      email: "maria@email.com",
      phone: "11999999999"
    });
  });

  it("normalizes CNPJ", () => {
    const client = createClientSchema.parse({
      type: "company",
      name: "Mustafa LTDA",
      document: "11.222.333/0001-81"
    });

    expect(client.document).toBe("11222333000181");
  });

  it("rejects invalid CPF for individual clients", () => {
    expect(() =>
      createClientSchema.parse({
        type: "individual",
        name: "Maria Silva",
        document: "111.111.111-11"
      })
    ).toThrow();
  });

  it("rejects invalid CNPJ for company clients", () => {
    expect(() =>
      createClientSchema.parse({
        type: "company",
        name: "Mustafa LTDA",
        document: "11.111.111/1111-11"
      })
    ).toThrow();
  });

  it("rejects phones outside 10 or 11 digits", () => {
    expect(() =>
      createClientSchema.parse({
        type: "individual",
        name: "Maria Silva",
        phone: "12345"
      })
    ).toThrow();
  });

  it("allows clearing optional fields on update", () => {
    const input = updateClientSchema.parse({
      document: "",
      email: null,
      phone: "",
      address: "",
      notes: ""
    });

    expect(input).toEqual({
      document: null,
      email: null,
      phone: null,
      address: null,
      notes: null
    });
  });

  it("defaults list status to active", () => {
    expect(listClientsQuerySchema.parse({})).toEqual({ status: "active" });
  });
});
