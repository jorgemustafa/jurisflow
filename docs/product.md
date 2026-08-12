# Magistrum Product

## What Is This?

Magistrum is a law office management system built to replace operational spreadsheets with one central workspace for clients, legal cases, finance, documents, and daily office workflows.

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
- Store optional RG and structured address blocks: street, city, state, and CEP.
- Allow optional CEP lookup through the free ViaCEP public API to prefill address fields.
- Validate CPF/CNPJ, email, and Brazilian phone when provided.
- Save CPF/CNPJ and phone numbers normalized as digits only.
- Use active/inactive for normal lifecycle changes.
- Link clients to cases, payments, and documents.
- Deleting a client permanently deletes its cases, payments, documents, and import items.
- Client is up to date with payment?

### Cases

- Register legal cases and internal matters.
- Allow creating a case directly from a client page; the new case remains linked to that client.
- Allow assisted import of Brazilian judicial cases by CNJ using free public DataJud data when configured.
- New case entry should use the import flow as the default path for judicial processes.
- Starting case import from a client page should preselect that client in the import review.
- Imported judicial cases must be manually linked to an active client before they become office cases.
- Allow editing case details from the case detail page.
- Track case status, CNJ number, area, responsible person, and relevant dates.
- Register timeline events for important case activity, such as notes, hearings, petitions, decisions, and status changes.
- Import public process movements into the case timeline when available from DataJud.
- Show a general timeline so the office can scan recent activity across all cases and filter it by CNJ.
- Import a process title from its DataJud class without appending the CNJ number.
- Track case deadlines and surface overdue or near-due alerts.
- Values, value of each installment, number of installment, total value
- Link documents, financial records, and client history.
- A client can have multiple cases, but one case is linked to only one client
- A case has statuses: resolved, in process, cancelled, etc
- Deleting a case is permanent and removes its linked payments, documents, deadlines, timeline events, sync runs, and notifications after explicit `DELETAR` confirmation.

### Finance

- Track receivables, fees, due dates, payments, installments, overdue amounts, and cancellations.
- Connect financial records to clients and cases when applicable.
- Make it easy to understand what needs action.
- Require an immutable financial agreement when a case is created or imported.
- Register the configurable entry as received at creation and derive monthly installments from the remaining balance and fixed installment value.
- Case financial schedules may start in the past when registering cases already in progress; generated due dates preserve the informed start date/day and calculate the final installment date from the number of derived installments.
- Carry unpaid installments into later month views while preserving and showing their original competence; mark them overdue only after their due date passes.

### Documents

- Store and organize documents by client and case.
- Keep metadata such as name, type, upload date, and related entity.
- Register validated binary metadata while keeping content outside PostgreSQL.
- Every document belongs to a client and can optionally belong to one case from that same client.
- Start with a replaceable storage service boundary. Local storage is acceptable for development, and external object storage can be added later.
- Store binaries only in private OCI Object Storage; local development uses OCI config-file credentials and production uses VM instance principal.
- Allow PDF and image preview; other supported formats are downloaded.
- Soft-deleted documents become unavailable immediately and their binaries are permanently removed after 30 days.
- Accept PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, and PNG up to the configured size limit (25 MB by default).
- Validate extension, MIME type, and file signature before storage.

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
- Treat public process integrations as assistive data, not as the only source of truth.
- Use pt-br as main language for frontend (later we can have a translator), backend must be in en-us
