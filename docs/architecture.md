# JurisFlow Architecture

## Stack

- Web: React, TypeScript, Vite, TanStack Query.
- API: Node.js, TypeScript, Fastify, Zod.
- Database: PostgreSQL with Prisma.
- Tests: Vitest for business rules and module behavior.
- Local infrastructure: Docker Compose with web, API, and PostgreSQL services.
- CI: GitHub Actions running install, Prisma generation, lint, typecheck, tests, and build.

## Backend Pattern

Use modules by business area.

```txt
modules/<domain>/
  <domain>.routes.ts
  <domain>.service.ts
  <domain>.repository.ts
  <domain>.schemas.ts
  <domain>.test.ts
```

- Routes handle HTTP concerns and validation.
- Services hold business rules.
- Repositories isolate Prisma access.
- Schemas define input contracts.

## Initial Domains

1. Clients
2. Cases
3. Finance
4. Documents

## Local Docker Services

- `web`: React/Vite development server exposed on port `5173`.
- `api`: Fastify development server exposed on port `3333`.
- `postgres`: PostgreSQL exposed on port `5432`.
