export type ClientType = "individual" | "company";
export type ClientStatus = "active" | "inactive";

export type ClientSummary = {
  id: string;
  type: ClientType;
  status: ClientStatus;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  updatedAt: string;
};
