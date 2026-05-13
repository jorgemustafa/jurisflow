import type { CreateClientInput } from "./clients.schemas.js";

type ClientRecord = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
};

type ClientsRepository = {
  list(): Promise<ClientRecord[]>;
  create(data: CreateClientInput): Promise<ClientRecord>;
};

export function createClientsService(repository: ClientsRepository) {
  return {
    list() {
      return repository.list();
    },

    async create(input: CreateClientInput) {
      const client = await repository.create(input);
      return client;
    }
  };
}
