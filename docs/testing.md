# Backend Testing

Automated tests for the API live next to the code they cover, as `*.test.ts`
files under `apps/api/src`. They run on [Vitest](https://vitest.dev) in a Node
environment with globals enabled (`vitest run --environment node --globals`).

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

- `payments.rules.test.ts` — installment generation (single full payment;
  sum of installments equals the total; even split with no remainder; correct
  `x/y` numbering), create guards (unknown client, unknown case), edit
  restrictions by status and source (paid can only correct `paidAt`; canceled
  can only edit notes / cancel reason; pending receipts must use the paid
  action; pending manual amounts are editable), mark-as-paid behavior (defaults
  `paidAt` to now, refuses canceled payments, throws when not found), and cancel
  rules (sets `canceledAt` + reason, keeps notes, refuses double cancel).
- `payments.schemas.test.ts` — request validation for creating, updating,
  marking paid, canceling, and scheduling payments, plus the list query
  defaults and transforms.
- `payments.service.test.ts` — the pre-existing service tests (manual
  client-only payment, case/client ownership, monthly installments with
  end-of-month due dates, one-schedule-per-case lock, overdue computation,
  generated-amount lock, mark paid, cancel).

> Note: a few finance rules are enforced at the database layer in
> `finance.repository.ts` (canceled payments excluded from totals via the
> `PENDING`/`PAID` filters, and `runningCases` counting `ACTIVE` + `ON_HOLD`).
> Those are not unit-tested here because they require a live database; they
> would be covered by an integration test against Postgres.
