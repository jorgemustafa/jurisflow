import type { ClientFormData } from "src/services/clients.js";

export const emptyClientForm: ClientFormData = {
  type: "individual",
  name: "",
  document: "",
  email: "",
  phone: "",
  address: "",
  notes: ""
};
