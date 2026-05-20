# JurisFlow Agent Instructions

Be direct, pragmatic, and concise. Keep the codebase small and clean. Avoid new patterns unless the project already has no suitable pattern.

## Before Changing Code

1. Search the existing code first.
2. Prefer the project stack and libraries already installed.
3. Keep edits scoped to the requested workflow.
4. Update or add tests for real business rules.
5. Do not create shallow tests that only mock behavior to pass.
6. Follow the nearest existing pattern before creating a new one.
7. You must document every new or updated business rule

## Before Committing

Do not commit until the relevant checks pass.

Required checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
docker compose config
docker compose build
```

When backend tests grow beyond the current API Vitest suite, always run them before committing backend changes. If a command cannot be run, state exactly why before committing or handing off.

## Project Patterns

- Architecture: `docs/architecture.md`
- Frontend: `docs/frontend-patterns.md`
- Testing: `docs/agent-testing.md`
- Code review: `docs/code-reviewer.md`
- Product rules: `docs/product.md`
- Data model rules: `docs/data-model-decisions.md`

## Stack

- Web: React, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui-style local components, Radix UI, TanStack Query, React Hook Form, Zod.
- API: Node.js, TypeScript, Fastify, Zod.
- Database: PostgreSQL, Prisma.
- Tests: Vitest.

## Shared Package

Use `packages/shared` only for cross-boundary contracts used by API and web:

- domain types and enums
- shared Zod schemas
- pure business validation helpers

Do not put React components, Prisma repositories, API routes, or frontend-only UI behavior in `packages/shared`.

## Commands

Use the existing npm workspace scripts:

```bash
npm run prisma:generate
npm run lint
npm run typecheck
npm test
npm run build
docker compose config
docker compose build
```

For package changes, use npm because this repo is npm-based and has `package-lock.json`.
