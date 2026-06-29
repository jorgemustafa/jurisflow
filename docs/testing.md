# Backend Testing

Automated API tests live under `apps/api/src/tests/<domain>/` as `*.test.ts`.
Frontend tests follow the same pattern under `apps/web/src/tests/<domain>/`.
They run on [Vitest](https://vitest.dev) in a Node environment with globals
enabled (`vitest run --environment node --globals`) for the API.

The tests are pure unit tests: services receive in-memory fake repositories, so
no database or external service is required to run them.

## Commands

Run the whole backend suite (from the repo root):

```bash
npm run test -w @jurisflow/api
```

Run every workspace that defines tests:

```bash
npm test
```

Both commands first build `@jurisflow/shared` via the `pretest` hook, so a clean
checkout works without extra setup.

Run a single module by passing a filename filter through to Vitest:

```bash
# only the finance dashboard tests
npm run test -w @jurisflow/api -- finance

# only the payments tests
npm run test -w @jurisflow/api -- payments
```

Watch mode while developing (re-runs on file changes):

```bash
npx vitest -w @jurisflow/api
```

## What the finance / payments tests cover

These tests follow the "Testing Decisions" section of
[`finance-v1-prd.md`](./finance-v1-prd.md). Because the finance business logic
lives in the `payments` module (installment generation, status rules) and the
`finance` module (dashboard month resolution), the coverage is split across both.

### `finance` module

- `finance.schemas.test.ts` — the dashboard query accepts a valid `YYYY-MM`
  month, treats `month` as optional, and rejects malformed values.
- `finance.service.test.ts` — the dashboard uses the month from the filters when
  given, and otherwise defaults to the current UTC month before calling the
  repository.

### `payments` module

- `payments.rules.test.ts` — paid entry plus fixed installment generation,
  smaller final installment, total preservation, end-of-month dates, next-month
  validation, generated-payment immutability, and manual cancellation rules.
- `payments.repository.test.ts` — monthly query scope for current competence,
  carried overdue payments, and late receipts by `paidAt`.
- `payments.schemas.test.ts` — request validation for creating, updating,
  marking paid and canceling payments, plus the list query
  defaults and transforms.
- `payments.service.test.ts` — manual client-only payment, case/client
  ownership, overdue computation, generated-payment lock, mark paid, and cancel.
- Web finance tests cover plan summaries, entry exclusion from installment
  progress, manual-payment exclusion, and metrics by competence and receipt date.

> Note: a few finance rules are enforced at the database layer in
> `finance.repository.ts` (canceled payments excluded from totals via the
> `PENDING`/`PAID` filters, and `runningCases` counting `ACTIVE` + `ON_HOLD`).
> Those are not unit-tested here because they require a live database; they
> would be covered by an integration test against Postgres.
