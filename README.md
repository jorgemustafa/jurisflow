# JurisFlow

A comprehensive law office management system designed to streamline client management, legal cases, payments, appointments, documents, and operational workflows in a centralized platform.

## Stack

- React + TypeScript + Vite
- Node.js + TypeScript + Fastify
- PostgreSQL + Prisma
- Vitest

## Estrutura

```txt
apps/
  api/
  web/
packages/
  shared/
prisma/
docs/
```

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
```

## Docker

```bash
npm run docker:up
npm run docker:down
```

The Docker Compose environment starts:

- `web` on `http://localhost:5173`
- `api` on `http://localhost:3333`
- `postgres` on `localhost:5432`
