# Finance v1 PRD

## Problem Statement

Magistrum needs a simple finance workflow that helps a criminal law office track agreed case fees, installments, overdue payments, received amounts, and operational dashboard metrics without introducing contract-level complexity too early.

The office usually charges cases in installments, but clients can also pay the full amount at once or pay future installments early. Payments must be reliable enough to support case closing rules and dashboard totals.

## Solution

Finance v1 keeps the agreed fee directly on `Case` and uses `Payment` rows as the source of truth for receivables and paid revenue.

There is no `CaseFee` table in v1. This is intentional: a separate fee table is more flexible for renegotiation and multiple fee agreements, but it adds workflow and UI complexity that is not needed yet. V1 assumes one generated payment schedule per case and supports manual one-off payments when needed.

## Core Rules

- `Case.totalFeeAmountCents` stores the legally agreed case value and is required.
- `Payment` rows represent the actual collection schedule and payment history.
- A payment always belongs to a client.
- A payment can optionally belong to a case.
- Client-only payments are allowed for general consultations, old balances, or administrative fees.
- If `caseId` is provided, the case must belong to the same client.
- Every manual or imported case requires `totalFeeAmountCents`, `entryAmountCents`, `installmentAmountCents`, `firstDueDate`, and `entryPaymentMethod`.
- Case, paid entry, installments, and imported movements are created atomically per case.
- A case can have at most one generated payment schedule in v1.
- The reason for locking one generated schedule is to avoid building renegotiation implicitly. Renegotiation needs clear rules for existing pending payments, paid payments, canceled payments, due dates, and audit history.
- `Case.totalFeeAmountCents` and every generated payment contract field are immutable after creation.
- The case client is immutable because the agreement and generated payments are bound to that client.
- Manual payments do not mutate `Case.totalFeeAmountCents`.
- Pending finance linked to a case blocks closing or canceling that case.

## Installments

- The entry is configurable, included in the agreed total, and stored as generated payment `0/N`, paid on its informed receipt date.
- The remaining balance is `totalFeeAmountCents - entryAmountCents`.
- The number of monthly installments is `ceil(balance / installmentAmountCents)`.
- The final installment contains only the remaining balance and can be lower than the chosen installment amount.
- `firstDueDate` must be in the calendar month immediately after case creation.
- Due dates repeat monthly on the same day as `firstDueDate`.
- If a future month does not have that day, the due date falls on the last day of that month.
- Sum of generated payments must equal `Case.totalFeeAmountCents`.
- Monthly installments use `1/N` through `N/N`; the paid entry is excluded from installment progress.

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
- Finance UI shows payments due in the selected month, pending payments from prior competence months, and payments received in the selected month.
- Overdue payments keep their original `dueDate`, remain visible in subsequent months until received, and display their original competence month.
- Prior-competence payments are marked overdue only when `dueDate` is before today; selecting a future month cannot make a future payment overdue.
- Late payments appear in their receipt month using `paidAt`, while retaining the original competence badge.
- Finance UI shows a process-level installment summary with total agreed value, split count, paid installments, pending installments, paid amount, and pending amount.
- The process-level installment summary shows the calculated month of the final installment.
- `paidAt` is required when status becomes `PAID`.
- UI defaults `paidAt` to today.
- User can override `paidAt` because payments may be registered late.
- Cases registered in progress default all installments due before registration to paid. The creation form can keep them pending instead, making them overdue by the standard due-date rule.
- `paymentMethod` is required by the API when marking a payment paid.
- UI preselects `PIX`; the user can confirm without touching it.
- Database keeps `paymentMethod` nullable for imported/legacy flexibility.

### Edit Pending Payment

Allowed for manual `PENDING` payments:

- `dueDate`
- `description`
- `notes`

Manual pending payments can also edit `amountCents`.

Generated payments can only register receipt and update internal notes. Amount, due date, description, numbering, case total, and schedule are fixed.

### Paid Payment Corrections

Allowed for manual `PAID` payments:

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
- Generated entries and installments cannot be canceled because cancellation would break the legally agreed total.

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
GET    /finance/dashboard?month=YYYY-MM
```

`POST /cases` requires the nested finance contract and creates the complete schedule atomically.

## Testing Decisions

Tests should cover business behavior, not implementation details:

- Generate a paid entry plus monthly installments from total, entry, and fixed installment amount.
- Move end-of-month due dates to the last day when needed.
- Keep a smaller remainder in the final installment.
- Require complete finance data on manual and imported case creation.
- Lock the case total and all generated payment contract fields.
- Allow manual client-only payments.
- Validate case belongs to client when `caseId` is provided.
- Compute overdue from `status` and `dueDate`.
- Mark payment paid with `paidAt` and `paymentMethod`.
- Prevent partial payments.
- Restrict edits by payment status and source.
- Require cancel reason when canceling.
- Exclude canceled payments from dashboard totals.
- Carry pending overdue payments into following month views without changing their due dates.
- Include late receipts in the `paidAt` month without duplicating rows.
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
