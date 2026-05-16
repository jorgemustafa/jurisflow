# JurisFlow Product

## What Is This?

JurisFlow is a law office management system built to replace operational spreadsheets with one central workspace for clients, legal cases, finance, documents, and daily office workflows.

This first version should focus on clarity, data organization, and repeatable workflows before adding advanced automation.

## Who Is It For?

Primary users:

- Small and medium law offices.
- Solo lawyers who manage clients, cases, payments, and documents manually.
- Administrative staff responsible for financial control, document organization, and follow-ups.

Secondary users:

- Partners who need visibility into office performance.
- Assistants who need simple operational screens without technical complexity.

## Problems It Solves

- Client information spread across spreadsheets, messages, folders, and memory.
- Weak visibility into active cases, deadlines, and status.
- Manual financial tracking with high risk of missed payments.
- Documents stored without clear relationship to clients or cases.
- Repetitive work caused by lack of structured data.

## Core Features

### Clients

- Register individuals and companies.
- Client Management v1 is the first usable workflow.
- Require only client type and name at creation.
- Store optional document, contact, free-text address, and notes.
- Validate CPF/CNPJ, email, and Brazilian phone when provided.
- Save CPF/CNPJ and phone numbers normalized as digits only.
- Keep clients active or inactive instead of physically deleting them.
- Link clients to cases, payments, and documents.
- Client is up to date with payment?

### Cases

- Register legal cases and internal matters.
- Track case status, CNJ number, area, responsible person, and relevant dates.
- Values, value of each installment, number of installment, total value
- Link documents, financial records, and client history.
- A client can have multiple cases, but one case is linked to only one client
- A case has statuses: resolved, in process, cancelled, etc

### Finance

- Track receivables, fees, due dates, payments, installments, overdue amounts, and cancellations.
- Connect financial records to clients and cases when applicable.
- Make it easy to understand what needs action.

### Documents

- Store and organize documents by client and case.
- Keep metadata such as name, type, upload date, and related entity.
- Every document belongs to a client and can optionally belong to one case from that same client.
- Start with a replaceable storage service boundary. Local storage is acceptable for development, and external object storage can be added later.

## What Matters Most

- Data reliability over flashy features.
- Simple workflows that reduce spreadsheet usage immediately.
- Clear business rules in code and tests.
- Fast screens for repeated office work.
- Low complexity architecture that remains easy to evolve.
- Strong domain documentation so LLMs can help without guessing.
- Test every feature that is added

## Product Principles

- Start with the smallest complete workflow.
- Prefer explicit fields and statuses over free-text ambiguity.
- Every important record should have ownership, status, and history when useful.
- Avoid building generic CRM features unless they solve a real law office workflow.
- Keep imports, automation, and AI features behind well-defined business rules.
- Use pt-br as main language for frontend (later we can have a translator), backend must be in en-us
