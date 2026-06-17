# Architecture Rules

- **LTG Vault TDR:** `docs/TDR_LTG_Vault_MVP.md` is the source of truth for product direction (notes vault, Argon2id-only vault KDF, encrypted metadata/index). Supersedes conflicting letters-only assumptions.
- **Phase 1 + 2 modular monolith:** domain code under `src/modules/*`; pure utilities in `core/`, `adapters/`, `primitives/` subfolders (see `docs/UTILITY_EXTRACTION_INVENTORY.md`).
- Prefer `@/modules/{name}` public APIs (`index.ts`, `server.ts`) over deep cross-module imports.
- Utility modules (`security`, `email/core`, `rate-limit/core`, `audit/core`, `ui/primitives`) must not import `vault` or `letters`.
- Product copy components (`PrivacyNotice`, `RecoveryNotice`) live in `vault/components`, not `ui/primitives`.
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
