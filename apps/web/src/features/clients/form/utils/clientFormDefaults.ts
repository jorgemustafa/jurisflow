import type { ClientFormData } from "src/services/clients.js";

export const emptyClientForm: ClientFormData = {
  type: "individual",
  name: "",
  document: "",
  rg: "",
  email: "",
  phone: "",
  address: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  notes: ""
};
