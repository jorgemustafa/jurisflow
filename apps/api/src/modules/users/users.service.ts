import type { CreateUserInput, UpdateUserInput, UserListFilters, UserRole, UserStatus } from "./users.schemas.js";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UsersRepository = {
  list(filters: UserListFilters): Promise<UserRecord[]>;
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string, excludeId?: string): Promise<UserRecord | null>;
  create(data: CreateUserInput): Promise<UserRecord>;
  update(id: string, data: UpdateUserInput): Promise<UserRecord>;
};

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
  }
}

export class UserEmailConflictError extends Error {
  constructor() {
    super("User email already exists");
  }
}

export function createUsersService(repository: UsersRepository) {
  async function ensureUniqueEmail(email: string | undefined, excludeId?: string) {
    if (!email) return;
    const existing = await repository.findByEmail(email, excludeId);
    if (existing) throw new UserEmailConflictError();
  }

  return {
    list(filters: UserListFilters) {
      return repository.list(filters);
    },

    async get(id: string) {
      const user = await repository.findById(id);
      if (!user) throw new UserNotFoundError();
      return user;
    },

    async create(input: CreateUserInput) {
      await ensureUniqueEmail(input.email);
      return repository.create(input);
    },

    async update(id: string, input: UpdateUserInput) {
      const current = await repository.findById(id);
      if (!current) throw new UserNotFoundError();

      await ensureUniqueEmail(input.email, id);
      return repository.update(id, input);
    }
  };
}
