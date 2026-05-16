# JurisFlow Architecture

## Stack

- Web: React, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui-style components, Radix UI, TanStack Query, React Hook Form, and Zod.
- API: Node.js, TypeScript, Fastify, Zod.
- Database: PostgreSQL with Prisma.
- Tests: Vitest for business rules and module behavior.
- Local infrastructure: Docker Compose with web, API, and PostgreSQL services.
- CI: GitHub Actions running install, Prisma generation, lint, typecheck, tests, and build.

## Frontend Pattern

Follow `docs/frontend-patterns.md` for web folder structure, service boundaries, component splitting, exports, forms, and frontend testing expectations.

## Shared Package Pattern

`packages/shared` is a contract package, not a general-purpose common folder.

Use it for code that must stay aligned between API and web:

- Domain types and enums.
- Shared Zod schemas for request/form contracts.
- Pure validation helpers that represent business rules.

Do not put app-specific implementation there:

- React components.
- Prisma models or repository logic.
- API route/service code.
- Frontend-only UI state or formatting.
- Utilities that are only used by one app.

If API and web are split into separate repositories later, this package should be small enough to publish privately, generate from API contracts, or copy deliberately.

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
