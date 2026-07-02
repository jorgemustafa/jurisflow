# Agent Testing Guide

Use this guide when adding or updating tests. Tests should protect business behavior, not implementation details.

## Test Stack

- Use Vitest.
- API tests live under `apps/api/src/tests/<domain>/`.
- Web tests live under `apps/web/src/tests/<domain>/`.
- Prefer focused schema and service tests before adding broader tests.

Current examples:

```txt
apps/api/src/tests/clients/clients.schemas.test.ts
apps/api/src/tests/clients/clients.service.test.ts
apps/api/src/tests/cases/cases.schemas.test.ts
apps/api/src/tests/cases/cases.service.test.ts
apps/api/src/tests/payments/payments.service.test.ts
apps/web/src/tests/finance/paymentPlans.test.ts
```

## Choosing The Test Type

Use schema tests when the behavior is input validation or normalization:

- required fields
- optional/nullable conversion
- CPF/CNPJ validation
- phone normalization
- date/month validation
- enum/default parsing

Use service tests when the behavior is business workflow:

- uniqueness checks
- status transitions
- relation rules
- payment schedule generation
- edit restrictions
- computed dashboard totals

Use repository or integration tests only when Prisma/database behavior itself needs coverage. Do not add database-heavy tests for pure service rules that can be covered with a small in-memory repository.

## Service Test Pattern

Keep service tests grouped with their business domain. Use a small in-memory repository that implements the service dependency contract.

```ts
function createRepository(seed: ClientRecord[] = []) {
  const clients = [...seed];

  return {
    clients,

    async findById(id: string) {
      return clients.find((client) => client.id === id) ?? null;
    },

    async create(data: CreateClientInput) {
      const client = { id: `client-${clients.length + 1}`, ...data };
      clients.push(client as ClientRecord);
      return client as ClientRecord;
    }
  };
}
```

Keep the fake repository honest:

- Store data in arrays or maps.
- Return realistic records.
- Implement the repository behavior the service actually depends on.
- Avoid mocks that only assert a function was called without proving the rule.

## Schema Test Pattern

Schema tests should assert parsed output when normalization matters.

```ts
it("normalizes CPF, email, and phone", () => {
  const client = createClientSchema.parse({
    type: "individual",
    name: " Maria Silva ",
    document: "529.982.247-25",
    email: " MARIA@EMAIL.COM ",
    phone: "(11) 99999-9999"
  });

  expect(client).toMatchObject({
    name: "Maria Silva",
    document: "52998224725",
    email: "maria@email.com",
    phone: "11999999999"
  });
});
```

## What To Avoid

- Do not test private helper implementation when a public schema/service rule covers it.
- Do not add tests that only check rendering without user-facing behavior.
- Do not mock a dependency so heavily that the business rule cannot fail.
- Do not create broad snapshot tests for forms or pages.
- Do not add a new test framework.

## Verification

Run the smallest useful command first while developing, then run the full pre-commit gate before committing.

```bash
npm test -w @magistrum/api
npm test
npm run typecheck
```

For frontend-only changes, also run:

```bash
npm run build -w @magistrum/web
```

## Pre-Commit Gate

Before committing, make sure these pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build
docker compose config
docker compose build
```

Also run backend tests whenever backend behavior changes. If future backend test suites are split by type, run the relevant focused suite first and the full backend suite before committing.

Do not commit code that does not follow an existing project pattern unless the new pattern is intentionally documented.
