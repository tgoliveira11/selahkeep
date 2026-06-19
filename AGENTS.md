# Agent Rules — SelahKeep MVP

> Former working name: LTG Vault. Current product name: SelahKeep.

## Source of Truth

Read and follow these documents before implementing:

- `docs/TDR_LTG_Vault_MVP.md` — **SelahKeep product/architecture (primary)**
- `docs/LTG_VAULT_IMPLEMENTATION_PLAN.md` — phased plan (Phases 0–5 complete)
- `docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md` — vault crypto, note keys, recovery phrase
- `docs/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md` — passkey PRF vault unlock
- `docs/MODULE_BOUNDARIES.md`
- `docs/AUTH_RESET_TO_SECURE_AUTH.md` — auth boundary (`@tgoliveira/secure-auth`)
- `docs/README.md` — documentation index

## Core Rule

**Never implement a backend path that receives or stores plaintext private note title/body/metadata.**

Note title, body, categories, and tags must be encrypted on the client before any API request.

## Architecture Boundary

```text
React UI
  -> Crypto Client Layer
  -> API Client
  -> API Route
  -> Service Layer
  -> Repository Layer
  -> PostgreSQL
```

Only the **Crypto Client Layer** may handle plaintext note title/body.

**Account authentication** is owned by `@tgoliveira/secure-auth` — do not reimplement login, OAuth, passkey account login, TOTP, sessions, or password flows locally.

React components must NOT import database clients, repositories, or ORM code.

## Forbidden

- Plaintext `title`, `body`, `content`, `message`, `markdown` fields for notes on APIs
- Reintroducing active `letters` routes, APIs, modules, schema, or UI (`/letters`, `/api/letters`, `letters` table)
- Server Actions for private note persistence
- Frontend direct database access
- localStorage/sessionStorage/cookies for plaintext keys or note content
- Exportable/raw device secrets in IndexedDB (use non-extractable `CryptoKey` only)
- Mock encryption, fake passkey flows, fake recovery flows
- AI APIs processing private note content
- Admin access to private note content
- Using TOTP 2FA, backup codes, or account login secrets as vault keys, note keys, or vault unlock material
- PBKDF2 fallback for **new** vault password or recovery phrase KDF paths (Argon2id only per ADR-005)
- Password reset or change flows that unlock, recover, or rotate the vault
- Confusing account sessions with vault unlock; account session does not decrypt notes
- Competing local auth/account implementation (see `no-local-auth-implementation.test.ts`)

## Stop Conditions

If cryptographic primitive, passkey key-wrapping, or recovery envelope design is unclear:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This implementation is incomplete and must not be used in production.
```

## Documentation (required on every change)

Keep docs accurate with the code. **Do not merge behavior changes without updating the relevant docs.**

| When you change… | Update… |
|------------------|---------|
| Setup, commands, ports, env vars | `README.md` |
| Layers, directories, data flow | `ARCHITECTURE.md`, `docs/MODULE_BOUNDARIES.md` |
| Crypto, vault, passkeys, recovery | `SECURITY.md`, ADR-005/006 |
| Agent workflow, testing, boundaries | `AGENTS.md`, `.cursor/rules/*.md` |
| Navigation / branding | `docs/LOGGED_IN_NAVIGATION_AUDIT.md`, `docs/UI_UX_DIRECTION.md` |
| New API routes or contracts | `docs/API_REFERENCE.md`, `ARCHITECTURE.md` |

## Testing (required on every change)

**Minimum coverage: 90%** for enforced scope (see `vitest.config.ts`).

Before finishing any task:

```bash
npm ci
npm run lint
npm run test:coverage
npm run build
```

### Test layers

| Layer | Location | Use for |
|-------|----------|---------|
| Unit | `src/test/unit/` | Pure helpers, crypto, validation |
| Security | `src/test/security/` | Plaintext rejection, boundaries, sentinel, doc guards |
| Services | `src/test/services/` | Business logic with mocked repositories |
| API routes | `src/test/api/` | Route handlers with mocked auth + services |
| Features | `src/test/features/` | Client flows (passkey unlock, nav, notes UI) |

Browser E2E (Playwright) was removed; see `docs/TESTING_STRATEGY.md`.

### Security tests (always required)

Sentinel phrase: `SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345` — must never appear in database records, API responses, logs, or admin endpoints.

Also maintain: `no-letters-domain.test.ts`, `no-local-auth-implementation.test.ts`, `documentation-current-state.test.ts`.
