# JurisFlow

A comprehensive law office management system designed to streamline client management, legal cases, payments, appointments, documents, and operational workflows in a centralized platform.

## Stack

- React + TypeScript + Vite
- React Router
- Tailwind CSS + shadcn/ui-style components + Radix UI
- TanStack Query
- React Hook Form + Zod
- Node.js + TypeScript + Fastify
- PostgreSQL + Prisma
- Vitest

## Estrutura

```txt
AGENTS.md
apps/
  api/
  web/
packages/
  shared/
prisma/
docs/
```

Agent-facing project rules live in `AGENTS.md` and the linked files under `docs/`.

## Shared Package

`packages/shared` is reserved for small cross-boundary contracts used by both API and web, such as domain types, schemas, and pure validation helpers. Keep app-specific code out of it.

Good candidates:

- Request/input schemas shared by API and frontend forms.
- Domain enums and DTO types.
- Pure business validation, such as CPF/CNPJ validation.

Avoid:

- React components.
- Prisma/database-specific types.
- API services, repositories, or route logic.
- Frontend-only UI/form behavior.
- Generic utilities without real reuse.

## Authentication

See `docs/authentication.md` for Postman examples, password setup/change requests, token refresh behavior, and implementation notes.

## Scripts

```bash
npm install
npm run docker:up
npm run prisma:generate
npm run prisma:migrate
npm run dev:api
npm run dev:web
npm run lint
npm run typecheck
npm test
npm run build
npm run prod:config
npm run prod:up
```

## Docker

```bash
npm run docker:up
npm run docker:down
```

The Docker Compose environment starts:

- `web` on `http://localhost:5173`
- `api` on `http://localhost:3333`
- `postgres` on `localhost:5433`

Production uses `compose.prod.yml` and an ignored `.env.prod`. See `docs/production.md` before deploying or rotating database credentials.
