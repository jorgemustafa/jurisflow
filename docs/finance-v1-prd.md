# Finance v1 PRD

## Problem Statement

JurisFlow needs a simple finance workflow that helps a criminal law office track agreed case fees, installments, overdue payments, received amounts, and operational dashboard metrics without introducing contract-level complexity too early.

The office usually charges cases in installments, but clients can also pay the full amount at once or pay future installments early. Payments must be reliable enough to support case closing rules and dashboard totals.

## Solution

Finance v1 keeps the agreed fee directly on `Case` and uses `Payment` rows as the source of truth for receivables and paid revenue.

There is no `CaseFee` table in v1. This is intentional: a separate fee table is more flexible for renegotiation and multiple fee agreements, but it adds workflow and UI complexity that is not needed yet. V1 assumes one generated payment schedule per case and supports manual one-off payments when needed.

## Core Rules

- `Case.totalFeeAmountCents` stores the agreed case value when known.
- `Payment` rows represent the actual collection schedule and payment history.
- A payment always belongs to a client.
- A payment can optionally belong to a case.
- Client-only payments are allowed for general consultations, old balances, or administrative fees.
- If `caseId` is provided, the case must belong to the same client.
- A case can be created without finance data.
- If a case is created with finance data, `totalFeeAmountCents`, `installmentCount`, and `firstDueDate` are required together.
- A payment schedule can also be generated later for an existing case if no generated schedule exists for that case.
- A case can have at most one generated payment schedule in v1.
- The reason for locking one generated schedule is to avoid building renegotiation implicitly. Renegotiation needs clear rules for existing pending payments, paid payments, canceled payments, due dates, and audit history.
- `Case.totalFeeAmountCents` is locked after generated payments exist. Direct edits are blocked to avoid corrupting finance data.
- Manual payments do not mutate `Case.totalFeeAmountCents`.
- Pending finance linked to a case blocks closing or canceling that case.

## Installments

- `installmentCount` is required whenever a total case fee is used to generate payments.
- `installmentCount = 1` means full payment in one installment.
- `installmentCount > 1` splits the total into monthly installments.
- Due dates repeat monthly on the same day as `firstDueDate`.
- If a future month does not have that day, the due date falls on the last day of that month.
- Payment amounts are split evenly.
- Rounding remainder goes into the last installment.
- Sum of generated payments must equal `Case.totalFeeAmountCents`.
- Every payment has `installmentNumber` and `installmentTotal`.
- One full payment uses `installmentNumber = 1` and `installmentTotal = 1`.

## Payment Status

Use stored statuses:

- `PENDING`
- `PAID`
- `CANCELED`

Do not store `OVERDUE` as a status. Overdue is computed:

```txt
status = PENDING and dueDate < today
```

Reason: overdue changes with time. Storing it would require a scheduled job just to keep status accurate.

## Payment Actions

### Create Manual Payment

Required:

- `clientId`
- `amountCents`
- `dueDate`
- `description`

Optional:

- `caseId`
- `notes`

Manual payments use:

- `source = MANUAL`
- `installmentNumber = 1`
- `installmentTotal = 1`
- `paymentScheduleId = null`

### Mark As Paid

- Payment is atomic. No partial payments in v1.
- User can pay current and future installments early by marking each payment as paid.
- Finance UI shows month-scoped payment rows and lets users mark pending rows as received.
- `paidAt` is required when status becomes `PAID`.
- UI defaults `paidAt` to today.
- User can override `paidAt` because payments may be registered late.
- `paymentMethod` is required by the API when marking a payment paid.
- UI preselects `PIX`; the user can confirm without touching it.
- Database keeps `paymentMethod` nullable for imported/legacy flexibility.

### Edit Pending Payment

Allowed for `PENDING` payments:

- `dueDate`
- `description`
- `notes`

Manual pending payments can also edit `amountCents`.

Generated pending payments cannot edit `amountCents` because that would silently change the agreed schedule and become a renegotiation flow.

### Paid Payment Corrections

Allowed for `PAID` payments:

- correct `paidAt`
- cancel payment

Not allowed:

- `amountCents`
- `dueDate`
- `clientId`
- `caseId`
- `installmentNumber`
- `installmentTotal`

### Cancel Payment

- No physical delete in v1.
- Use `status = CANCELED`.
- `cancelReason` is required when canceling.
- `canceledAt` is set automatically.
- Canceled payments are hidden by default.
- Canceled payments do not count as receivable or paid revenue.
- After cancellation, only `cancelReason` and `notes` can be edited.

## Payment Method

Payment method values:

- `PIX`
- `CASH`
- `BANK_TRANSFER`
- `CREDIT_CARD`
- `DEBIT_CARD`
- `BOLETO`
- `OTHER`

Database has no default. UI defaults to PIX when marking as paid.

## Dashboard V1

Dashboard has a selected month filter, defaulting to the current month. User can move to previous and future months.

### Month-Scoped Metrics

- `receivedInMonth`: sum of `PAID` payments where `paidAt` is inside selected month.
- `dueInMonth`: sum of `PENDING` payments where `dueDate` is inside selected month.

### Global Snapshot Metrics

- `totalToReceive`: sum of all `PENDING` payments, regardless of due date.
- `overdueAmount`: sum of `PENDING` payments where `dueDate < today`.
- `activeClients`: count of `ACTIVE` clients only.
- `runningCases`: count of cases with `ACTIVE` or `ON_HOLD` status.

Inactive clients are not shown in dashboard v1.

### Dashboard Lists

Show overdue payments first:

- client name
- case title when present
- installment `x/y`
- amount
- due date
- days overdue

Show upcoming payments in the selected month below overdue:

- client name
- case title when present
- installment `x/y`
- amount
- due date
- status

## API Shape

Recommended endpoints:

```txt
GET    /payments
POST   /payments
PATCH  /payments/:id
PATCH  /payments/:id/paid
PATCH  /payments/:id/cancel
POST   /cases/:id/payments/schedule
GET    /finance/dashboard?month=YYYY-MM
```

`POST /cases` can also optionally accept a payment schedule during case creation.

## Testing Decisions

Tests should cover business behavior, not implementation details:

- Generate one installment for full payment.
- Generate multiple monthly installments.
- Move end-of-month due dates to the last day when needed.
- Keep rounding remainder in the last installment.
- Prevent more than one generated schedule per case.
- Require `installmentCount` and `firstDueDate` with total case fee.
- Lock `Case.totalFeeAmountCents` after generated payments exist.
- Allow manual client-only payments.
- Validate case belongs to client when `caseId` is provided.
- Compute overdue from `status` and `dueDate`.
- Mark payment paid with `paidAt` and `paymentMethod`.
- Prevent partial payments.
- Restrict edits by payment status and source.
- Require cancel reason when canceling.
- Exclude canceled payments from dashboard totals.
- Include active and on-hold cases in running cases.

## Out of Scope

- `CaseFee` table.
- Multiple generated schedules per case.
- Renegotiation workflow.
- Partial payments.
- Physical payment deletion.
- Receipt/proof upload.
- Payment document upload.
- Advanced reports and charts.
- Revenue by legal area.
