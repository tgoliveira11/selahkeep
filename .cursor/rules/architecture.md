# Architecture Rules

- Follow layer boundary: UI -> Crypto Client -> API Client -> API Route -> Service -> Repository -> PostgreSQL.
- Only `src/lib/crypto-client` handles plaintext letter title/body.
- React components must not import from `src/lib/db`, `src/server/repositories`, or ORM clients.
- All private letter persistence through explicit `/api/*` routes.
- User-owned queries scoped by authenticated user ID.
- Physical deletion for letters (no soft delete).
- Letter IDs: client generates UUID; server persists same ID (no server reassignment).
- Sensitive multi-write flows must use `runInTransaction()` — see `src/lib/db/transaction.ts`.
- Trusted-device envelopes must link to `publicMetadata.trustedDeviceId`; revoke envelope when device revoked.
