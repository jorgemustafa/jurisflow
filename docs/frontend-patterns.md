# Frontend Patterns

This document defines the frontend patterns for future implementations in `apps/web`.

## Stack

- React + TypeScript + Vite.
- React Router for client-side routes.
- TanStack Query for server state, cache, loading states, and mutations.
- Lucide React for icons.
- CSS global for now. Do not add a UI kit, styling framework, or form library unless there is a clear need and existing patterns are not enough.

## File Organization

Keep `.tsx` and `.ts` responsibilities separate.

- `.tsx`: pages, route components, layout components, and UI components.
- `.ts`: services, types, config, constants, formatters, and pure helpers.

Preferred structure:

```txt
apps/web/src/
  App.tsx
  main.tsx
  layout/
  features/
    <domain>/
  services/
  utils/
  styles.css
```

`App.tsx` should stay small and focus on route composition. It should not contain page logic, API calls, forms, or domain helpers.

## Features

Group UI by business domain under `features/<domain>`.

For domains with multiple screens, split by real responsibility instead of route names alone:

```txt
features/clients/
  CreateClientPage.tsx
  UpdateClientPage.tsx
  detail/
    ClientDetailsPage.tsx
    ClientDetailItem.tsx
  form/
    ClientForm.tsx
    FieldError.tsx
    utils/
      clientFormDefaults.ts
  list/
    ClientsPage.tsx
    ClientsTable.tsx
  utils/
    clientLabels.ts
```

Use this pattern when a domain has list/detail/form responsibilities. Do not create deep folders before the screen has enough code to justify them.

Create and update pages can remain thin wrappers when they share the same form. Prefer a shared `form/` folder before duplicating create/update UI.

## Services

Services must be split by module/domain.

```txt
services/
  http.ts
  clients.ts
  finance.ts
```

- `http.ts`: shared request layer, API errors, query-string helpers.
- `<domain>.ts`: API calls and frontend response/input types for that domain.

Do not create empty service files for domains that are not used by the frontend yet. Add `cases.ts`, `documents.ts`, etc. when the first real frontend call needs them.

## Utils

Use global `utils/` only for generic helpers that are not tied to a domain.

Examples:

```txt
utils/
  format.ts
  appModules.ts
```

Use `features/<domain>/utils/` for domain-specific helpers, labels, defaults, and mappers.

## Exports

Prefer const exports:

```tsx
export const ClientsPage = () => {
  return <div />;
};
```

This is the default style for components, pages, services, and helpers.

Prefer one exported component per `.tsx` file. Small private components can stay in the same file only when they are tightly coupled and keeping them there improves readability. Once they grow or become reusable, move them to their own file.

## Component Splitting

Split components when one of these is true:

- The page mixes multiple responsibilities, such as filters, table, form, detail actions, or summaries.
- A private component grows enough to make the parent harder to scan.
- The component is reused by another screen.
- The screen has a clear subdomain responsibility, such as `list`, `detail`, or `form`.

Avoid splitting every small JSX fragment into its own file. More files should make the domain easier to navigate, not just increase indirection.

## Data Fetching

Use TanStack Query for API reads and writes.

- Pages or feature components should call `useQuery` and `useMutation`.
- Query keys should be stable and domain-oriented.
- Mutations should update or invalidate affected queries.
- Keep raw `fetch` usage inside `services/http.ts`.

## Forms

Use simple React state while forms are small.

- Keep form defaults in feature-specific `.ts` helpers.
- Keep field error display as a small component when reused across fields.
- Use backend validation errors as the source of truth for business rules.
- Do not add a form library unless the forms become complex enough to justify it.

## Tests

Add or update tests when a frontend change introduces business rules, branching behavior, or user-facing logic that can regress.

Do not add shallow tests that only assert components render without validating behavior. Prefer tests that cover actual rules, transformations, or workflows.

## Adding New Frontend Work

Before adding a new pattern or dependency:

1. Search for an existing project pattern.
2. Reuse current libraries and folder conventions.
3. Add the smallest structure that makes the feature clear.
4. Split further only when the feature grows enough to justify it.
