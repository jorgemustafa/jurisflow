import type { ClientFormData, ClientStatus, ClientType } from "@magistrum/shared";
import { request, searchParams } from "src/services/http.js";

export type { ClientFormData, ClientStatus, ClientType };

export type Client = {
  id: string;
  type: ClientType;
  status: ClientStatus;
  name: string;
  document: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export const listClients = (filters: { q: string; status: string; type: string }) => {
  return request<Client[]>(`/clients${searchParams(filters)}`);
};

export const getClient = (id: string) => {
  return request<Client>(`/clients/${id}`);
};

export const createClient = (data: ClientFormData) => {
  return request<Client>("/clients", { method: "POST", body: JSON.stringify(data) });
};

export const updateClient = (id: string, data: ClientFormData) => {
  return request<Client>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) });
};

export const updateClientStatus = (id: string, status: ClientStatus) => {
  return request<Client>(`/clients/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
};
