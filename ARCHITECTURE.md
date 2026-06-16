# Architecture — Private Letters Vault MVP

## Stack

- **Frontend:** Next.js, TypeScript, React
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL
- **ORM:** Drizzle

## Modular monolith (Phase 1 + Phase 2)

This project uses an **internal modular monolith** per `docs/ADR-004_Modularization_and_Reusability_Strategy.md`.

- Business logic lives under `src/modules/{auth,account,sessions,two-factor,passkeys,email,audit,rate-limit,security,vault,letters,ui}`.
- **Phase 2** isolates pure utilities in subfolders (`security/logger`, `email/core`, `rate-limit/adapters`, `ui/primitives`, …). See `docs/UTILITY_EXTRACTION_INVENTORY.md`.
- Next.js routes stay in `src/app/api` and delegate to module services.
- Legacy paths (`src/server/services`, `src/lib/auth`, …) re-export from `src/modules/*` during migration.
- **No external packages** or monorepo — utilities are internal only until Phase 4.

See `docs/MODULE_BOUNDARIES.md` for responsibilities and forbidden cross-module imports.

## Layers

```text
React UI (src/app, src/components, src/features)
  -> Crypto Client Layer (src/lib/crypto-client, vault module API)
  -> API Client (src/lib/api-client)
  -> API Route Layer (src/app/api) — thin handlers
  -> Module services (src/modules/*/services)
  -> Module repositories (src/modules/*/repositories)
  -> Database (PostgreSQL via Drizzle — src/lib/db)
```

## Directory Structure

```text
src/
  modules/             # Phase 1 domain modules (see MODULE_BOUNDARIES.md)
    auth/ account/ sessions/ two-factor/ passkeys/
    email/ audit/ rate-limit/ security/ vault/ letters/ ui/
  app/
    (public)/          # Landing, marketing
    (auth)/            # Login, signup
    (vault)/           # Letters, devices, recovery
    api/               # REST API routes (thin; delegate to modules)
  components/          # App shell + domain components (migrating to modules)
    ui/                # Re-exports from modules/ui
    layout/            # SiteShell, Nav, SiteFooter, PageLayout
    letters/           # LetterCard
  features/            # Client feature flows (passkey, vault)
  lib/
    crypto-client/     # Client-side encryption ONLY (vault boundary)
    api-client/        # HTTP client for API
    validation/        # Shared Zod schemas
    db/                # Drizzle client (server-only)
  server/              # Legacy shims re-exporting modules (Phase 1)
```

## API Routes

See also [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) and [`docs/openapi.yaml`](./docs/openapi.yaml).

- Local Swagger UI: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- OpenAPI JSON: `GET /api/openapi`

**`/api-docs` layout:** Swagger UI intentionally renders **without** `SiteShell` (`Nav` / `SiteFooter`) so the vendor UI can use the full viewport. The page still includes the global skip link from the root layout and sets `id="main-content"` on its `<main>`. In production the route returns 404 unless `ENABLE_API_DOCS=true` (see `.env.example` and `docs/API_REFERENCE.md`).

- Passkey registration without PRF does **not** create `passkey_authorized_device` envelopes and does **not** revoke existing passkey envelopes
- Passkey-based vault unlock requires PRF support. If PRF is unavailable, the app must not create a passkey vault envelope and must not present that passkey as a recovery method.
- Trusted-device offline unlock: when the app is offline and the current device has valid local vault material, local unlock may be allowed. The device revocation status will be verified again when the app reconnects. This is an offline usability trade-off and does not override online revocation checks. UI surfaces `TrustedDeviceUnlockVerification` (`verified-online` vs `allowed-offline`) via `useVault().offlineNotice`.
- WebAuthn challenge validation uses atomic `consumeValidChallenge()` only (`findValidChallenge` removed)
- `client_device_id` column on `trusted_devices` with partial unique index for active devices
- WebAuthn challenge indexes: `idx_webauthn_challenges_lookup`, `idx_webauthn_challenges_expires_at`

- `POST/GET /api/letters`, `GET/PUT/DELETE /api/letters/:id`
- `POST /api/vault/init`, `GET /api/vault/status`
- `GET/POST /api/trusted-devices`, `POST /api/trusted-devices/:id/remove`, `DELETE /api/trusted-devices/:id`
- `POST /api/recovery-code`, `POST /api/vault/unlock-with-recovery-code`
- `POST /api/passkeys/register`, `POST /api/passkeys/authenticate`, `DELETE /api/passkeys` — vault recovery passkey flows (authenticated)
- `POST /api/auth/passkey/login/options`, `POST /api/auth/passkey/login/verify` — passkey account sign-in (unauthenticated; bypasses TOTP)
- `GET /api/account/passkeys`, `POST /api/account/passkeys/register`, `DELETE /api/account/passkeys/:id`, `POST /api/account/passkeys/:id/enable-vault-unlock`
- `DELETE /api/account` — account deletion
- `GET /api/account/2fa/status`, `POST /api/account/2fa/setup/start`, `POST /api/account/2fa/setup/verify`, `POST /api/account/2fa/disable`, `POST /api/account/2fa/backup-codes/regenerate`
- `POST /api/auth/login/start`, `POST /api/auth/login/verify-2fa`, `POST /api/auth/login/verify-2fa-oauth`
- NextAuth OAuth providers: Google, Apple, Microsoft (`azure-ad` — Microsoft identity platform; account auth only; scopes `openid email profile`)
- `POST /api/auth/verify-email/resend`, `POST /api/auth/verify-email/confirm` — email verification (hashed tokens in `account_tokens`)
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` — password reset (generic forgot response; no vault involvement)
- `POST /api/account/change-password`, `GET /api/account/auth-status` — signed-in password change and auth capability flags
- `GET /api/account/sessions`, `DELETE /api/account/sessions/:id`, `POST /api/account/sessions/revoke-others`, `POST /api/account/sessions/revoke-all`, `POST /api/account/sessions/ping` — account session management (not vault/trusted devices)

### Account email and password flows

```text
Register (credentials) -> unverified user + verification email -> /check-email
Verify link -> POST /api/auth/verify-email/confirm -> email_verified_at

Forgot -> POST /api/auth/forgot-password (generic) -> reset email
Reset link -> POST /api/auth/reset-password -> password_hash + password_updated_at

Settings -> POST /api/account/change-password -> password_updated_at (current session kept)
```

- Service: `src/server/services/account-auth-service.ts`
- Tokens: `src/server/repositories/account-token-repository.ts` (`email_verification`, `password_reset`)
- Email: `src/server/email/send-email.ts` dispatches by `EMAIL_PROVIDER`; `smtp-provider.ts` (nodemailer); `config.ts` (SMTP/Mailpit/Brevo env parsing)
- Password policy: `src/lib/password-policy.ts` (env-driven `off` | `warn` | `enforce`)
- UI: `(auth)/check-email`, `verify-email`, `forgot-password`, `reset-password`; settings components `email-verification-settings`, `change-password-settings`, `password-strength-field`

Changing or resetting the account password does **not** unlock, recover, or rotate the private letters vault.

## Envelope Encryption

```text
Letter title/body -> Letter Key -> User Vault Key -> vault envelopes
```

Vault envelope methods: `trusted_device`, `passkey_authorized_device`, `recovery_code`

## UI layer

- **Design docs:** `docs/UI_UX_AUDIT.md`, `docs/UI_UX_IMPLEMENTATION_PLAN.md`
- **Layout:** `SiteShell` (`Nav` + `SiteFooter`) on `(public)`, `(auth)`, and `(vault)` route groups; `PageLayout` for content width; responsive mobile menu in `Nav`. Auth pages use package UI inside the shell. See `docs/LAYOUT_NAVIGATION_AUDIT.md`.
- **Vault unlock:** shared `VaultUnlockPanel` used by `/vault/unlock` and `VaultAccessGate`
- **Tokens:** CSS variables in `src/app/globals.css` (calm neutral + sage primary)
- **Security UX:** no plaintext letters in URLs/titles; recovery code cleared after confirm; `ConfirmDialog` for destructive actions

## AAD binding (ADR-001)

Client generates letter UUIDs and binds encrypted payloads with AAD:

- `aad.userId` — authenticated user ID
- `aad.resourceId` — persisted letter/vault resource ID (client-provided letter UUID)
- `aad.field` — encrypted field name (`title`, `body`, `letter_key`, etc.)

Server validates AAD in `src/server/policies/aad-validation.ts` before storage. Client verifies AAD in `src/lib/crypto-client/aad-verify.ts` before decryption.

## Database transactions

Multi-step sensitive flows use `runInTransaction()` (`src/lib/db/transaction.ts`):

- vault initialization (trusted device + envelope + link)
- trusted device create/revoke (device row + envelope revoke)
- recovery code store/regenerate
- passkey register/remove

Failures roll back all related writes.

## Trusted device revocation

- Every trusted-device envelope stores `publicMetadata.trustedDeviceId`
- Revoking a device revokes its envelope in the same transaction
- Client checks `GET /api/trusted-devices/status?deviceId=` before unlock; clears IndexedDB on revoke
- **Offline limitation:** cached local envelope may still decrypt until the next online status check

## Passkey account sign-in

Passkeys authenticate the account separately from vault decryption.

- Login UI: **Sign in with passkey** on `/login` (`@tgoliveira/secure-auth/react` `LoginPage`, wired through `src/lib/secure-auth/react-client.ts` shim)
- Challenge type `login` (atomic consumption; distinct from vault `authentication`)
- Successful verify issues one-time `login-token` with `twoFactorVerified: true` (no TOTP step)
- Optional automatic vault unlock when the credential has a valid PRF-based envelope and PRF output is available client-side (`src/features/passkey/sign-in-with-passkey.ts`; see `docs/PASSKEY_LOGIN_VAULT_UNLOCK.md`)
- Otherwise: signed in, vault locked → `/vault/unlock`
- Account settings list passkeys with **Sign-in only** vs **Sign-in + vault unlock** labels

## Account two-factor authentication

TOTP 2FA is **account authentication only** — separate from vault envelopes, recovery codes, passkeys, and trusted devices.

Passkey sign-in does **not** require TOTP when 2FA is enabled. Email/password sign-in still does.

- Settings UI: `/settings/account` (`TwoFactorSettings`)
- Login challenge: `/login/2fa` + middleware gate for OAuth partial sessions
- Storage: `user_two_factor_settings`, `user_two_factor_backup_codes`, login challenge/token tables
- NextAuth provider: `login-token` (one-time token after password + optional 2FA)

## Trusted device identity

A trusted device is one browser storage profile: local `clientDeviceId` + local device key + one active `trusted_devices` row + compatible vault envelope.

- Normal and incognito/private windows are different storage profiles when IndexedDB is isolated (different `clientDeviceId`).
- `/vault/devices` marks **This device** only when the local `clientDeviceId` matches an active server row.
- Unregistered profiles show **Trust this browser** when the vault is unlocked; registration creates a new row and envelope.
- Coarse metadata (`browser`, `platform`, `deviceType`) is display-only and must not prove identity.
- MVP does **not** auto-relink or mutate existing rows based on metadata matches.

## API Routes (additional)

- `GET /api/trusted-devices/status?deviceId=` — device active/revoked state for unlock gating
- `POST /api/trusted-devices/touch` — updates `lastUsedAt`; returns revoked state
- `DELETE /api/account` — account deletion (cascades encrypted user data)

## Rate limiting

`src/server/policies/rate-limit/` — adapter interface, in-memory (dev/test) and PostgreSQL (production via `RATE_LIMIT_STORE=postgres`).

## Audit events

`src/server/policies/audit-sanitization.ts` + `audit-repository.ts` — non-sensitive audit trail.

## Vault session

`src/lib/crypto-client/vault-session.ts` — inactivity auto-lock (15 min), manual lock, unload guard.

## Beta documentation

- [`docs/THREAT_MODEL_Private_Letters_Vault.md`](./docs/THREAT_MODEL_Private_Letters_Vault.md)
- [`docs/LGPD_BETA_GATES.md`](./docs/LGPD_BETA_GATES.md)
- [`docs/BACKUP_RESTORE_POLICY.md`](./docs/BACKUP_RESTORE_POLICY.md)
