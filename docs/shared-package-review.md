# Shared Package Review

`packages/shared` is currently limited to cross-boundary client contracts:

- client domain types
- client Zod schemas
- CPF/CNPJ, email, phone, and client form validation helpers

Current usage is appropriate:

- API client schemas import shared client validation.
- Web client services/forms reuse the same client contract.
- No React components, Prisma access, API routes, repositories, or frontend-only UI behavior live in `packages/shared`.

Do not move case, finance, document, deadline, or timeline code into `packages/shared` unless the same contract is actively needed by both API and web. Keep single-app behavior near its module until reuse is real.
