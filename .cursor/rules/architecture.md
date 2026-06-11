# Architecture Rules

- **Phase 1 modular monolith:** domain code under `src/modules/*`; see `docs/MODULE_BOUNDARIES.md` and ADR-004.
- Prefer `@/modules/{name}` public APIs (`index.ts`, `server.ts`) over deep cross-module imports.
- Follow layer boundary: UI -> Crypto Client -> API Client -> API Route -> Module Service -> Repository -> PostgreSQL.
- Only `src/lib/crypto-client` (vault module) handles plaintext letter title/body.
- React components must not import from `src/lib/db`, repositories, or ORM clients.
- All private letter persistence through explicit `/api/*` routes.
- User-owned queries scoped by authenticated user ID.
- Physical deletion for letters (no soft delete).
- Letter IDs: client generates UUID; server persists same ID (no server reassignment).
- Sensitive multi-write flows must use `runInTransaction()` — see `src/lib/db/transaction.ts`.
- Trusted-device envelopes must link to `publicMetadata.trustedDeviceId`; revoke envelope when device revoked.
- Rate limits via `src/server/policies/rate-limit/` (never global operation-only keys).
- Account deletion via `DELETE /api/account` (not UI-only hiding).
- Autosave disabled for MVP; no plaintext drafts anywhere.
