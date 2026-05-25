# Tasks

## MVP Milestones

### Phase 1 - Project Setup

- [x] initialize monorepo
- [x] create API app with Fastify
- [x] create web app with React and Vite
- [x] create shared package
- [x] add initial Prisma schema
- [x] add initial architecture docs
- [x] configure TypeScript
- [x] configure Vitest
- [x] configure Docker for web, API, and PostgreSQL
- [x] add PostgreSQL local setup via Docker Compose
- [x] create initial database migration
- [x] configure linting
- [x] configure CI/CD
- [x] add frontend stack: Tailwind, shadcn/ui-style primitives, Radix, React Hook Form, and Zod
- [x] add AI agent instructions for project patterns, testing, frontend, and code review

---

### Phase 2 - Product Requirements

- [x] define first usable workflow
- [x] define client business rules
- [x] define case business rules
- [x] define finance business rules
- [x] define document business rules
- [x] create domain glossary

---

### Phase 3 - Authentication

- [x] create minimal user model
- [x] backend JWT auth
- [x] password hashing
- [x] refresh token flow
- [x] login page
- [x] forgot password
- [x] RBAC middleware
- [x] authenticated layout

---

### Phase 4 - Client Management

- [x] create client endpoint
- [x] update client endpoint
- [x] client status endpoint
- [x] get client endpoint
- [x] client list endpoint
- [x] configure React Router client pages
- [x] client list page
- [x] client detail page
- [x] client form page
- [x] search/filter clients
- [x] client validation tests

---

### Phase 5 - Case Management

- [x] case creation
- [x] case update
- [x] case list page
- [x] link case to client
- [x] CNJ number validation
- [x] timeline events
- [x] document links
- [x] deadline alerts

---

### Phase 6 - Finance

- [x] create payment record
- [x] update payment status
- [x] list receivables
- [x] overdue payment detection
- [x] link payments to clients
- [x] link payments to cases
- [x] finance dashboard basics
- [x] generate case payment schedule

---

### Phase 7 - Documents

- [x] define storage strategy
- [x] upload document
- [x] link document to client
- [x] link document to case
- [x] list documents by client
- [x] list documents by case
- [x] document metadata validation

---

## Technical Debt

- [ ] improve workspace scripts after dev workflow stabilizes
- [ ] review shared package usage before adding runtime contracts
- [x] add lint rules after first modules are implemented
- [x] decide Docker strategy for local development
- [x] verify full Docker runtime
- [ ] document local Node/npm setup quirks on Windows
- [x] document auth flow and Postman usage
- [x] document pre-commit verification requirements
- [x] document frontend stack and shared package boundaries
- [x] adapt imported agent docs to JurisFlow conventions

---

## Bugs

### High Priority

- [ ] none reported

### Medium Priority

- [ ] none reported

---

## Future Features

- [ ] AI case summarization
- [ ] WhatsApp integration
- [ ] e-signatures
- [ ] automated deadline reminders
- [ ] document template generation

---

## Current Focus

Working on:

- Technical debt
- local Node/npm setup quirks on Windows
