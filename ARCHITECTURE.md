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

- `POST/GET /api/letters`, `GET/PUT/DELETE /api/letters/:id`
- `POST /api/vault/init`, `GET /api/vault/status`
- `GET/POST /api/trusted-devices`, `DELETE /api/trusted-devices/:id`
- `POST /api/recovery-code`, `POST /api/vault/unlock-with-recovery-code`
- `POST /api/passkeys/register`, `POST /api/passkeys/authenticate`, `DELETE /api/passkeys`
- `DELETE /api/account` — account deletion

## Envelope Encryption

```text
Letter title/body -> Letter Key -> User Vault Key -> vault envelopes
```

Vault envelope methods: `trusted_device`, `passkey_authorized_device`, `recovery_code`

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
