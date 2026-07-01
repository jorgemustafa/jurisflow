import { parseArgs } from "node:util";
import { createUserSchema } from "../apps/api/src/modules/users/users.schemas.js";
import { usersRepository } from "../apps/api/src/modules/users/users.repository.js";
import { UserEmailConflictError, createUsersService } from "../apps/api/src/modules/users/users.service.js";
import { prisma } from "../apps/api/src/shared/db/prisma.js";

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    email: { type: "string" },
    password: { type: "string" },
    role: { type: "string", default: "lawyer" },
    "oab-number": { type: "string" },
    "oab-state": { type: "string" }
  }
});

async function main() {
  const input = createUserSchema.parse({
    name: values.name,
    email: values.email,
    password: values.password,
    role: values.role,
    oabNumber: values["oab-number"],
    oabState: values["oab-state"]
  });
  const user = await createUsersService(usersRepository).create(input);
  console.log(`User created: ${user.name} <${user.email}> (${user.role})`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof UserEmailConflictError) console.error("A user with this email already exists.");
    else console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
