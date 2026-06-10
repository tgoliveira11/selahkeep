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
- `POST /api/passkeys/register`, `POST /api/passkeys/authenticate`

## Envelope Encryption

```text
Letter title/body -> Letter Key -> User Vault Key -> vault envelopes
```

Vault envelope methods: `trusted_device`, `passkey_authorized_device`, `recovery_code`
