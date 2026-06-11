# Architecture — Private Letters Vault MVP

## Stack

- **Frontend:** Next.js, TypeScript, React
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL
- **ORM:** Drizzle

## Layers

```text
React UI (src/app, src/components, src/features)
  -> Crypto Client Layer (src/lib/crypto-client)
  -> API Client (src/lib/api-client)
  -> API Route Layer (src/app/api)
  -> Service Layer (src/server/services)
  -> Repository Layer (src/server/repositories)
  -> Database (PostgreSQL via Drizzle)
```

## Directory Structure

```text
src/
  app/
    (public)/          # Landing, marketing
    (auth)/            # Login, signup
    (vault)/           # Letters, devices, recovery
    api/               # REST API routes
  components/          # Shared UI
    ui/                # Design system (Button, Card, Alert, FormField, …)
    layout/            # Nav, PageLayout
    letters/           # LetterCard
  features/            # Feature modules
    letters/
    vault/
    trusted-devices/
    recovery/
    auth/
  lib/
    crypto-client/     # Client-side encryption ONLY
    api-client/        # HTTP client for API
    validation/        # Shared Zod schemas
    auth/              # Auth helpers
    db/                # Drizzle client (server-only)
  server/
    repositories/      # Data access
    services/          # Business logic
    policies/          # Authorization, plaintext rejection
```

## API Routes

See also [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) and [`docs/openapi.yaml`](./docs/openapi.yaml).

- Local Swagger UI: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- OpenAPI JSON: `GET /api/openapi`

**`/api-docs` layout:** Swagger UI intentionally renders **without** the app navigation shell (`PageLayout` / `Nav`) so the vendor UI can use the full viewport. The page still includes the global skip link from the root layout and sets `id="main-content"` on its `<main>`. In production the route returns 404 unless `ENABLE_API_DOCS=true` (see `.env.example` and `docs/API_REFERENCE.md`).

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
- `POST /api/passkeys/register`, `POST /api/passkeys/authenticate`, `DELETE /api/passkeys`
- `DELETE /api/account` — account deletion
- `GET /api/account/2fa/status`, `POST /api/account/2fa/setup/start`, `POST /api/account/2fa/setup/verify`, `POST /api/account/2fa/disable`, `POST /api/account/2fa/backup-codes/regenerate`
- `POST /api/auth/login/start`, `POST /api/auth/login/verify-2fa`, `POST /api/auth/login/verify-2fa-oauth`

## Envelope Encryption

```text
Letter title/body -> Letter Key -> User Vault Key -> vault envelopes
```

Vault envelope methods: `trusted_device`, `passkey_authorized_device`, `recovery_code`

## UI layer

- **Design docs:** `docs/UI_UX_AUDIT.md`, `docs/UI_UX_IMPLEMENTATION_PLAN.md`
- **Layout:** `PageLayout` + responsive `Nav` (mobile menu below `md`)
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

## Account two-factor authentication

TOTP 2FA is **account authentication only** — separate from vault envelopes, recovery codes, passkeys, and trusted devices.

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
