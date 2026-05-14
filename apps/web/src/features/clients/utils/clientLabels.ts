import type { Client, ClientStatus } from "../../../services/clients.js";

export const labelClientType = (type: Client["type"]) => {
  return type === "individual" ? "Pessoa física" : "Pessoa jurídica";
};

export const labelClientStatus = (status: ClientStatus) => {
  return status === "active" ? "Ativo" : "Inativo";
};
