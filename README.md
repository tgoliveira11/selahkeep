# Letters to God — Private Letters Vault MVP

Web-first responsive MVP for private encrypted spiritual letters.

## Privacy Promise

> Your private letters are protected on your device before they are saved. Our systems are designed so our team does not have access to the keys required to read them.

## Stack

- Next.js + TypeScript + React
- PostgreSQL + Drizzle ORM
- NextAuth (Google, Apple, email/password)
- Web Crypto API (AES-GCM) + Argon2id recovery KDF
- WebAuthn passkeys (@simplewebauthn)

## Quick Start

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker compose up -d

# Configure environment (required for migrations and the app)
cp .env.example .env.local
# Ensure DATABASE_URL is set in .env.local, e.g.:
# DATABASE_URL=postgresql://letters:letters_dev@localhost:5432/letters_to_god
# NEXTAUTH_URL=http://localhost:3001

# Generate and run migrations (reads .env.local automatically)
npm run db:generate
npm run db:migrate

# Start dev server (port 3001)
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3001) |
| `npm run build` | Production build |
| `npm run test` | Run all Vitest tests |
| `npm run test:coverage` | Vitest with coverage thresholds (≥90% lines/statements/functions) |
| `npm run test:all` | Coverage tests, then Playwright E2E |
| `npm run test:e2e` | Browser E2E tests (Playwright; needs PostgreSQL + dev server) |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations to PostgreSQL |
| `docker compose up -d` | Start local PostgreSQL |

E2E browser install (once): `npx playwright install chromium`

Reuse an already-running dev server for E2E:

```bash
PLAYWRIGHT_REUSE_SERVER=true npm run test:e2e
```

## Testing

Tests are split by layer. Vitest runs everything under `src/test/`; Playwright runs `e2e/`.

| Type | Location | What it covers |
|------|----------|----------------|
| **Unit** | `src/test/unit/` | Crypto helpers, vault unlock, PRF/WebAuthn option preparation, validation, rate limits, API client, logger, env loading |
| **Security** | `src/test/security/` | Plaintext rejection, schema invariants, AAD canonicalization, sentinel phrase, frontend/API boundaries, logger redaction |
| **Services** | `src/test/services/` | Business logic with mocked repositories (letters, vault, passkeys, trusted devices, admin) |
| **API routes** | `src/test/api/` | Route handlers with mocked auth + services (letters, vault, passkeys, recovery, register, admin) |
| **Features** | `src/test/features/` | Client feature flows such as passkey unlock |
| **E2E** | `e2e/` | Full browser lifecycle: register → login → vault setup → write → list → edit → sign out |

Recent passkey-related coverage includes:

- PRF salt derivation (`src/test/security/passkey-prf.test.ts`)
- WebAuthn JSON → `ArrayBuffer` conversion for PRF extensions (`src/test/unit/prepare-webauthn-options.test.ts`)
- Passkey registration/authentication services and routes
- Passkey removal (`DELETE /api/passkeys`)

Coverage is enforced on core application code (`src/lib`, `src/server/services`, `src/server/policies`, `src/app/api`, `src/features/passkey`). Repository adapters and UI pages are covered indirectly via service/API/E2E tests.

```bash
npm run test:coverage   # must pass before merge
npm run test:all        # coverage + E2E smoke
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md), and [AGENTS.md](./AGENTS.md).

## Documentation

- [TDR](./docs/TDR_Private_Letters_Vault_MVP_Revised.md)
- [ADR-001 Cryptography](./docs/ADR-001_Cryptographic_Payload_Format_and_Envelope_Encryption.md)
- [ADR-002 Vault Unlocking](./docs/ADR-002_Vault_Unlocking_Passkeys_Trusted_Devices_Recovery_Code.md)
- [ADR-003 API & Schema](./docs/ADR-003_API_Contract_Database_Schema_No_Plaintext_Enforcement.md)
