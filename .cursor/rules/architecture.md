# Architecture Rules

- **LTG Vault TDR:** `docs/TDR_LTG_Vault_MVP.md` is the source of truth for product direction (notes vault, Argon2id-only vault KDF, encrypted metadata/index). Phases 0–5 complete.
- **Auth boundary:** account authentication from `@tgoliveira/secure-auth` only — see `docs/AUTH_RESET_TO_SECURE_AUTH.md`.
- **Modular monolith:** domain code under `src/modules/*`; see `docs/MODULE_BOUNDARIES.md`.
- Utility modules must not import product `vault` or `notes` internals incorrectly.
- Follow layer boundary: UI → Crypto Client → API Client → API Route → Service → Repository → PostgreSQL.
- Only `src/lib/crypto-client` handles plaintext note title/body before encryption.
- React components must not import `src/lib/db`, repositories, or ORM clients.
- All note persistence through `/api/notes` with encrypted payloads only.
- **No active `letters` domain** — notes + vault only.
- Note IDs: client generates UUID; server persists same ID.
- Sensitive multi-write flows use `runInTransaction()`.
- Rate limits via `src/server/policies/rate-limit/`.
- Account deletion via package `DELETE /api/account` with DB cascade to vault/notes.
- Vault auto-lock: 15-minute inactivity (`vault-session.ts`).
