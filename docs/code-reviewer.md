# Code Review Guide For Agents

Use this guide before opening a PR or when asked to review changes. Lead with bugs, risks, and missing tests. Keep style comments secondary.

## Review Priorities

1. Bugs, data loss, broken flows, invalid state transitions.
2. Security and authorization risks for API/routes/data handling.
3. Business rule gaps against the docs.
4. Test coverage quality.
5. Project convention violations.
6. Clarity, naming, and unnecessary complexity.

## Gather Context

Run:

```bash
git branch --show-current
git diff --stat
git diff --name-only
git diff
```

Read the relevant project docs:

- `AGENTS.md`
- `docs/architecture.md`
- `docs/frontend-patterns.md` for web changes
- `docs/agent-testing.md` for test changes
- Domain PRDs or data model docs for business rules

If the diff is large, state that and focus on the highest-risk files first.

## Pre-Commit Checks

A change is not ready to commit or merge until these are addressed:

- Backend tests pass when backend behavior changes.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- `docker compose config` passes.
- `docker compose build` passes.
- The implementation follows the nearest existing code pattern, or the new pattern is documented.

If any check was not run, call that out explicitly in the review.

## What To Check

### API

- Validate all external input with Zod.
- Keep routes focused on HTTP concerns.
- Keep business rules in services.
- Keep Prisma access in repositories.
- Do not leak internal errors to clients.
- Check relation rules and status transitions.

### Frontend

- Use TanStack Query for server state.
- Keep raw fetch calls inside services.
- Use React Hook Form + Zod for non-trivial forms.
- Keep API validation mapped to field errors when possible.
- Use local `components/ui` primitives before raw repeated styling.
- Keep visible text in pt-BR.

### Shared Package

- Only cross-boundary contracts belong in `packages/shared`.
- Reject React, Prisma, route, repository, or frontend-only behavior there.
- Shared code should be easy to publish, copy, or generate if repos split later.

### Tests

- Tests should fail when a real business rule breaks.
- Prefer schema/service tests for domain logic.
- Avoid mock-only tests with no meaningful assertions.
- Add edge cases for invalid input, conflict rules, status changes, and null/optional behavior.

## Output Format

Use this structure:

```md
## Findings

1. **BUG** `path/to/file.ts:10`
   Explain the issue and why it matters.

2. **RISK** `path/to/file.ts:25`
   Explain the risk and what would make it safer.

## Questions

- Any assumptions or unclear product behavior.

## Testing

- What was verified.
- Missing coverage or commands not run.

## Summary

Brief summary of the reviewed change.
```

If there are no findings, say so clearly and still mention residual test risk.

## Tone

- Be direct and specific.
- Do not invent issues.
- Do not require subjective style changes unless they violate documented project patterns.
- Prefer concrete examples over broad advice.
- Keep review comments about the code, not the author.
