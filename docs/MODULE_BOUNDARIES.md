# Module Boundaries — Phase 1 + Phase 2

**Status:** Phase 2 — Pure internal utilities extracted (no external packages)

This project uses a **modular monolith** under `src/modules/`. No external packages or monorepo are created in Phase 1.

## Modules

| Module | Responsibility |
|--------|----------------|
| `auth` | Email/password, OAuth, passkey login, auth callbacks, login rate limits |
| `account` | Settings, email verification, password reset/change, account deletion |
| `sessions` | Account sessions (sign-in state), revocation, session metadata |
| `two-factor` | TOTP setup/verify, backup codes, login 2FA challenge |
| `passkeys` | WebAuthn registration, passkey account authentication |
| `email` | `core/` provider abstraction (SMTP/console); `templates/` account-auth emails only |
| `audit` | Audit events, persistence, sanitization |
| `rate-limit` | Rate limit adapters and policies |
| `security` | Logger/redaction, password policy, token hashing, IP mask/hash, user-agent parse/hash, email scope hashing (`logger/`, `env/`, `ip/`, `user-agent/`, `scopes/`) |
| `vault` | User Vault Key, unlock, trusted devices, recovery, passkey PRF envelopes |
| `letters` | Private letter CRUD (encrypted payloads only) |
| `ui` | `primitives/` domain-neutral UI only; product copy (`PrivacyNotice`, `RecoveryNotice`) in `vault/components` |

## Critical distinctions

```text
account authentication ≠ vault decryption
account sessions ≠ trusted devices
TOTP ≠ vault recovery
password reset ≠ vault recovery
passkey authentication ≠ passkey vault unlock (without PRF envelope)
```

## Allowed dependency direction

```text
ui, security, email, audit, rate-limit
  -> auth, account, sessions, two-factor, passkeys
  -> vault
  -> letters (may depend on vault client)
```

## Forbidden dependencies (enforced in tests)

- `auth` must not import `vault` or `letters`
- `account` must not import `letters`
- `sessions` must not import `vault` services or trusted-device repositories
- `two-factor` must not import `vault` or crypto-client letter paths
- `email` must not import `vault` or `letters`
- `audit` must not reference private letter content fields
- `rate-limit` must not reference private letter plaintext
- `ui` must not import product modules or database clients
- `vault` must not import `letters` UI

## Reusable vs product-specific

**Internally reusable (after stabilization):** auth, account, sessions, two-factor, passkeys, email, audit, rate-limit, security, ui

**Product-specific:** vault crypto-client (`src/lib/crypto-client` re-exported by `modules/vault`), letters, spiritual copy, community features

## Legacy import paths

During Phase 1, many moved files keep **re-export shims** at their original paths (e.g. `src/server/services/auth-service.ts` → `src/modules/auth/services/`). New code should prefer `@/modules/*` public APIs (`index.ts`, `server.ts`).

## Phase 2 utility layout

```text
src/modules/security/{logger,env,password-policy,ip,user-agent,scopes,policies}
src/modules/email/{core,templates}
src/modules/rate-limit/{core,adapters}
src/modules/audit/{core,repositories}
src/modules/ui/{primitives,lib}
src/modules/vault/components/{privacy-notice,recovery-notice}
```

Public APIs: `@/modules/security`, `@/modules/email`, `@/modules/email/templates`, `@/modules/rate-limit`, `@/modules/audit`, `@/modules/ui`.

Inventory: `docs/UTILITY_EXTRACTION_INVENTORY.md`.

## Next phases (not in scope)

- Phase 3: secure Next.js account starter template
- Phase 4: extract packages only after a second real consumer

See `docs/ADR-004_Modularization_and_Reusability_Strategy.md`.
