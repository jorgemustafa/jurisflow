# Client Management v1 PRD

## Problem Statement

JurisFlow needs its first complete, usable workflow. Client records are the root of future cases, finance, and documents, so the system needs a reliable way to create, find, update, view, and inactivate clients before expanding into dependent modules.

The current client module is only an initial API slice. It does not yet cover the agreed business rules for individuals and companies, progressive data completion, status handling, detail/edit flows, or the filters needed for daily office use.

## Solution

Build Client Management v1 as the first complete workflow. Users can register individual or company clients with only the minimum required data, complete optional fields over time, search and filter the client base, view details, edit records, and inactivate or reactivate clients without deleting history.

The first version should stay small and operational: `type` and `name` are required, every other field is optional and validated only when present. Documents, phone numbers, and display formats are normalized by the system so data remains searchable and consistent.

## User Stories

1. As an office user, I want to create an individual client, so that I can start tracking a person in JurisFlow.
2. As an office user, I want to create a company client, so that I can start tracking a business in JurisFlow.
3. As an office user, I want only type and name to be required, so that I can register clients quickly and complete their data later.
4. As an office user, I want to add CPF or CNPJ when available, so that the client has a stronger identifier.
5. As an office user, I want CPF and CNPJ to be validated when provided, so that obviously invalid documents do not enter the database.
6. As an office user, I want CPF and CNPJ to be stored without punctuation, so that search and uniqueness stay consistent.
7. As an office user, I want CPF and CNPJ to be unique when provided, so that two records do not share the same strong identifier.
8. As an office user, I want to leave document empty, so that incomplete but valid initial registrations are allowed.
9. As an office user, I want duplicate names to be allowed when document is empty, so that real people with the same name are not blocked.
10. As an office user, I want to add an email when available, so that I can keep contact data in the client record.
11. As an office user, I want email to be validated when provided, so that bad contact data is rejected.
12. As an office user, I want to add a Brazilian phone number when available, so that I can contact the client later.
13. As an office user, I want phone numbers to be accepted with common formatting, so that I do not need to manually remove punctuation.
14. As an office user, I want phone numbers to be stored as digits only, so that search and display are consistent.
15. As an office user, I want phone numbers with 10 or 11 digits to be accepted, so that fixed and mobile numbers are supported.
16. As an office user, I want to add a free-text address, so that I can store address data without a full address workflow.
17. As an office user, I want to add internal notes, so that relevant operational context stays attached to the client.
18. As an office user, I want to list clients, so that I can browse the active client base.
19. As an office user, I want active clients to appear by default, so that the daily list stays focused.
20. As an office user, I want to filter clients by status, so that I can inspect active, inactive, or all clients.
21. As an office user, I want to filter clients by type, so that I can separate individuals and companies.
22. As an office user, I want to search by name, document, email, or phone, so that I can find clients quickly.
23. As an office user, I want the list to show name, type, document, primary contact, status, and update date, so that I can distinguish records without opening each one.
24. As an office user, I want to open a client detail page, so that I can review all registered data.
25. As an office user, I want the detail page to show creation and update dates, so that I can understand when the record was created or last changed.
26. As an office user, I want to edit all client fields, so that incomplete or incorrect data can be fixed.
27. As an office user, I want to add, change, or remove CPF/CNPJ after creation, so that progressive registration is supported.
28. As an office user, I want to change the client type, so that classification mistakes can be corrected.
29. As an office user, I want type changes to respect the current document, so that a CPF cannot remain on a company or a CNPJ on an individual.
30. As an office user, I want validation errors to appear near the relevant fields, so that I know what to fix.
31. As an office user, I want a manual save action, so that changes are only persisted intentionally.
32. As an office user, I want to cancel form changes, so that I can leave without persisting accidental edits.
33. As an office user, I want to inactivate a client, so that clients outside the current operation leave the default list.
34. As an office user, I want to reactivate a client, so that a former client can return when new cases appear.
35. As an office user, I want inactive clients to remain viewable and editable, so that historical data can still be maintained.

## Implementation Decisions

- Client Management is the first usable workflow.
- Client is the root entity for future cases, finance, and documents.
- Client type is required and supports individual and company clients.
- Client name is required. It represents full name for individuals and company name/legal name for companies.
- CPF/CNPJ is optional in v1.
- CPF/CNPJ must be valid when provided, using check digit validation and rejecting repeated digit sequences.
- CPF/CNPJ must be saved as digits only.
- CPF/CNPJ must be unique only when present.
- Email is optional and must be valid when present.
- Phone is optional, accepts common Brazilian formatting, is saved as digits only, and must contain 10 or 11 digits when present.
- Address is optional free text in v1.
- Notes are optional free text in v1.
- Client status supports active and inactive.
- New clients default to active.
- Inactive clients are excluded from the default listing.
- Inactive clients can be viewed, edited, and reactivated.
- Physical deletion is out of scope for v1.
- Creating new cases for inactive clients should require reactivation in the future cases module. This rule is documented now but not implemented in Client Management v1.
- REST remains the API style for this workflow.
- Required API surface: list clients with filters, create client, get client by id, update client, and update client status.
- List filters support text search, status, and type.
- Text search covers name, document, email, and phone.
- The web app should use React Router for client pages.
- The web app should consume the real API through React Query and fetch.
- The web app should use `VITE_API_URL` with a local fallback.
- The form uses explicit save and cancel actions.
- API validation issues should map to field errors where possible, with a general fallback error for unexpected failures.
- Database field-level decisions are tracked in `docs/data-model-decisions.md`.

## Testing Decisions

- Tests should cover business behavior through schemas/services/API boundaries, not private implementation details.
- Use Vitest, following the existing client service test style.
- Avoid mock-only tests that do not assert real business rules.
- Required rule coverage:
  - Create individual with only type and name.
  - Create company with only type and name.
  - Normalize CPF/CNPJ when provided.
  - Reject invalid CPF for individual clients.
  - Reject invalid CNPJ for company clients.
  - Reject duplicate document when provided.
  - Allow duplicate names when document is empty.
  - Normalize phone when provided.
  - Reject phone outside 10 or 11 digits.
  - Edit document while respecting type and uniqueness.
  - Change type when document is empty.
  - Block type changes when the current document becomes invalid for the new type.
  - Inactivate and reactivate clients.
  - List active clients by default.
  - Filter by status, type, and text search.
- UI tests are not required for v1 unless the implementation introduces logic that is hard to trust through API/service tests.

## Out of Scope

- Authentication and authorization.
- Physical client deletion.
- Structured address fields, CEP lookup, city, state, or address validation.
- Case creation, finance, and document workflows.
- Duplicate warning by similar name.
- Audit trail beyond created and updated timestamps.
- Notes history, comments, authorship, or audit events.
- Client import/export.
- Advanced CRM features.

## Further Notes

- Frontend visible text should be in pt-BR.
- Backend code and contracts should stay in en-US.
- Keep the implementation small and aligned with existing module boundaries: routes handle HTTP, schemas validate contracts, services hold business rules, and repositories isolate Prisma.
