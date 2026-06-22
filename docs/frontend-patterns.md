# Frontend Patterns

This document defines the frontend patterns for future implementations in `apps/web`.

## Stack

- React + TypeScript + Vite.
- React Router for client-side routes.
- TanStack Query for server state, cache, loading states, and mutations.
- Tailwind CSS for styling.
- shadcn/ui-style local components for reusable UI primitives.
- Radix UI for accessible low-level primitives where needed.
- React Hook Form for non-trivial forms.
- Zod for frontend validation when it improves UX and can reuse shared business rules.
- Lucide React for icons.

Keep this stack lean. Add shadcn/Radix components only when a screen needs them; do not import a large component surface preemptively.

## Hard Rules

- Use npm workspace scripts because this repo is npm-based and has `package-lock.json`.
- Do not add dependencies before checking whether the project already has a suitable library.
- Do not use TypeScript `enum`; prefer string unions, Zod enums, or `as const` objects.
- Do not use `any`; find the right type or narrow the data.
- Do not create a new utility without searching existing `lib/`, `utils/`, feature `utils/`, and `packages/shared`.
- Do not create a new reusable component before checking `components/ui/` and nearby feature components.
- Do not use `==` or `!=`; use strict equality.
- Do not duplicate API business rules in frontend-only code. Move shared contracts or pure validation to `packages/shared` when both API and web need them.
- Every component must be responsive to mobiles, 70% of the effort for computers and 30% for mobiles
- Always run npm run typecheck to assert TS is running without errors

## File Organization

Keep `.tsx` and `.ts` responsibilities separate.

- `.tsx`: pages, route components, layout components, and UI components.
- `.ts`: services, types, config, constants, formatters, and pure helpers.

Preferred structure:

```txt
apps/web/src/
  App.tsx
  main.tsx
  components/
    ui/
  layout/
  features/
    <domain>/
  lib/
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

Use `lib/` for small frontend infrastructure helpers used by UI primitives, such as `cn()`.

## UI Components

Keep shared UI primitives in `components/ui/`.

The current pattern follows shadcn/ui style:

- Components are local source files, not a black-box UI package.
- Tailwind classes live close to the component.
- Radix primitives are used for accessibility when useful.
- `cn()` combines conditional classes and resolves Tailwind conflicts.

Examples:

```txt
components/ui/
  button.tsx
  input.tsx
  label.tsx
  select.tsx
  textarea.tsx
```

Do not wrap every HTML element. Add a primitive when it creates consistency or removes repeated styling.

Use raw HTML controls only when they are local to one screen and do not duplicate an existing primitive. When the same control styling repeats, promote it to `components/ui/`.

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
- Use `services/<domain>.ts` functions as the only place where feature code talks to the API.

## Forms

Use React Hook Form for forms with validation, API field errors, edit/create reuse, or enough fields that manual state becomes noisy.

- Keep form defaults in feature-specific `.ts` helpers.
- Keep field error display as a small component when reused across fields.
- Use Zod schemas through `zodResolver` for client-side validation.
- Reuse schemas or pure validation helpers from `@jurisflow/shared` when the rule is a real business contract.
- Keep backend validation as the authority. Frontend validation improves UX but does not replace API validation.
- Map API validation errors back into React Hook Form with `setError`.

Avoid duplicating business rules separately in the UI. If both API and web need the same rule, move the shared contract or pure helper to `packages/shared`.

## Tests

Add or update tests when a frontend change introduces business rules, branching behavior, or user-facing logic that can regress.

Do not add shallow tests that only assert components render without validating behavior. Prefer tests that cover actual rules, transformations, or workflows.

## Adding New Frontend Work

Before adding a new pattern or dependency:

1. Search for an existing project pattern.
2. Reuse current libraries and folder conventions.
3. Add the smallest structure that makes the feature clear.
4. Split further only when the feature grows enough to justify it.
