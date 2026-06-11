# Agent Rules — Private Letters Vault MVP

## Source of Truth

Read and follow these documents before implementing:

- `docs/TDR_Private_Letters_Vault_MVP_Revised.md`
- `docs/ADR-001_Cryptographic_Payload_Format_and_Envelope_Encryption.md`
- `docs/ADR-002_Vault_Unlocking_Passkeys_Trusted_Devices_Recovery_Code.md`
- `docs/ADR-003_API_Contract_Database_Schema_No_Plaintext_Enforcement.md`
- `docs/ADR-004_Modularization_and_Reusability_Strategy.md`
- `docs/MODULE_BOUNDARIES.md`

## Core Rule

**Never implement a backend path that receives or stores plaintext private letter title/body.**

Private letter title and body must be encrypted on the client before any API request.

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

Only the **Crypto Client Layer** may handle plaintext private letter title/body.

React components must NOT import database clients, repositories, or ORM code.

## Forbidden

- Plaintext `title`, `body`, `content`, `message` fields for private letters
- Server Actions for private letter persistence
- Frontend direct database access
- localStorage/sessionStorage/cookies for plaintext keys or letter content
- Exportable/raw device secrets in IndexedDB (use non-extractable `CryptoKey` only)
- Duplicate trusted-device registration for the same client `deviceId`
- Mock encryption, fake passkey flows, fake recovery flows
- AI APIs processing private letter content
- Admin access to private letter content
- Using TOTP 2FA, backup codes, or account login secrets as vault keys, letter keys, recovery codes, or trusted-device unlock material
- Plaintext email verification or password reset tokens in database, logs, or analytics
- Password reset or change flows that unlock, recover, or rotate the private letters vault
- Confusing account sessions with trusted devices; revoking sessions must not revoke trusted-device vault envelopes

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
| Crypto, vault, passkeys, recovery | `SECURITY.md` and/or ADRs (or add `TODO_SECURITY_REVIEW`) |
| Agent workflow, testing, boundaries | `AGENTS.md`, `.cursor/rules/*.md` |
| New API routes or contracts | ADR-003 alignment; note in `ARCHITECTURE.md` if structural |

Rules:

- README must describe how to run the app **and** how to run tests (including coverage).
- If you add a feature, user-facing flow, or recovery method, document it in README or SECURITY as appropriate.
- Do not leave stale instructions (e.g. wrong port, missing env vars, outdated test commands).

## Testing (required on every change)

**Minimum coverage: 90%** for lines, statements, functions, and branches on enforced scope (see `vitest.config.ts`).

Before finishing any task:

```bash
npm ci                  # clean install from lockfile
npm run lint            # ESLint
npm run test:coverage   # must pass thresholds
npm run build           # production typecheck + build
```

If coverage drops below 90%, add or extend tests until `npm run test:coverage` passes. Do not lower thresholds to make CI green.

### Test layers (use the right type)

| Layer | Location | Use for |
|-------|----------|---------|
| Unit | `src/test/unit/` | Pure helpers, crypto, validation, clients |
| Security | `src/test/security/` | Plaintext rejection, boundaries, sentinel phrase, redaction |
| Services | `src/test/services/` | Business logic with mocked repositories |
| API routes | `src/test/api/` | Route handlers with mocked auth + services |
| Features | `src/test/features/` | Client feature flows (e.g. passkey unlock) |
| E2E | `e2e/` | Full browser lifecycle (Playwright) |

Guidelines:

- Prefer **unit tests** for deterministic logic (crypto, parsing, validation).
- Prefer **service/API tests** for authorization, rate limits, and envelope storage.
- Use **E2E** sparingly for critical user journeys; keep most coverage in Vitest.
- New API routes, services, or crypto paths **must** include tests in the matching layer.
- Security-sensitive paths (passkeys, recovery, vault unlock, account 2FA) need explicit tests; see `.cursor/rules/testing.md`.

Enforced coverage scope (see `vitest.config.ts`):

- `src/lib/**` (except excluded db/auth barrel files)
- `src/server/services/**`, `src/server/policies/**`
- `src/app/api/**` (except NextAuth catch-all route)
- `src/features/passkey/**`

Repository adapters and UI pages are covered indirectly via service/API/E2E tests unless a change adds testable logic there—in that case extend the appropriate layer.

### Security tests (always required)

Implement and maintain sentinel phrase tests and the checklist in `.cursor/rules/testing.md`.

Sentinel phrase: `SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345` — must never appear in database records, API responses, logs, or admin endpoints.
