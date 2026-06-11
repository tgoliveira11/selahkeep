# Letters to God — Private Letters Vault MVP

Web-first responsive MVP for private encrypted spiritual letters.

## Privacy Promise

> Your private letters are protected on your device before they are saved. Our systems are designed so our team does not have access to the keys required to read them.

## Stack

- Next.js + TypeScript + React
- PostgreSQL + Drizzle ORM
- NextAuth (Google, Apple, email/password)
- Web Crypto API (AES-GCM) + Argon2id recovery KDF
- WebAuthn passkeys (@simplewebauthn) — passkeys can sign in to the account; vault unlock via passkey requires WebAuthn **PRF** support and a valid PRF-based vault envelope

## Quick Start

```bash
# Install dependencies (CI / clean checkout)
npm ci

# Start PostgreSQL
docker compose up -d

# Configure environment (required for migrations and the app)
cp .env.example .env.local
# Ensure DATABASE_URL is set in .env.local, e.g.:
# DATABASE_URL=postgresql://letters:letters_dev@localhost:5432/letters_to_god
# NEXTAUTH_URL=http://localhost:3001
# TWO_FACTOR_SECRET_ENCRYPTION_KEY=<openssl rand -base64 32>  # required for account 2FA

# Generate and run migrations (reads .env.local automatically)
npm run db:generate   # after schema changes
npm run db:migrate    # required after pulling schema updates (e.g. trusted device metadata)

# Start dev server (port 3001)
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## UI / UX

Design audit and implementation plan:

- [`docs/UI_UX_AUDIT.md`](./docs/UI_UX_AUDIT.md) — screen inventory, issues, priorities
- [`docs/UI_UX_IMPLEMENTATION_PLAN.md`](./docs/UI_UX_IMPLEMENTATION_PLAN.md) — design principles, components, checklists

Shared UI components live under `src/components/ui/`. Pages use `PageLayout` for consistent mobile-first shell and navigation.

## API reference (Swagger UI)

Browse REST endpoints in Swagger UI during local development:

1. Run `npm run dev`
2. Open [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
3. Sign in to the app in the **same browser** before trying authenticated routes

OpenAPI spec: `docs/openapi.yaml` (JSON at `GET /api/openapi`). Full details: [docs/API_REFERENCE.md](./docs/API_REFERENCE.md).

Production hides `/api-docs` unless `ENABLE_API_DOCS=true` in `.env.local`.

## Passkeys (sign-in and vault unlock)

- **Sign in with passkey** on `/login` — phishing-resistant account authentication; does not require TOTP even when 2FA is enabled
- **Account settings → Passkeys** — register sign-in passkeys, upgrade to vault unlock when vault is unlocked and PRF is supported, remove passkeys
- **Recovery page** — register passkey + PRF vault envelope while vault is unlocked (sign-in + vault unlock)
- If a passkey signs you in but cannot unlock the vault, you remain signed in and are guided to trusted device, recovery code, or another passkey with vault unlock support

Run `npm run db:migrate` after pulling passkey account-auth schema updates (`0005_passkey_account_authentication.sql`).

## Two-factor authentication (optional)

Account-level TOTP 2FA can be enabled from **Account settings**. It adds an extra sign-in code when signing in with **email and password** and does **not** replace your private letter recovery code or vault unlock methods. **Passkeys** use device verification and do not require a separate one-time code.

Requires `TWO_FACTOR_SECRET_ENCRYPTION_KEY` in `.env.local` (see `.env.example`). Run `npm run db:migrate` after pulling 2FA schema updates.

## Email verification and account passwords

Email/password accounts are **unverified by default** until the user opens the link sent after registration (`/check-email` → `/verify-email?token=…`).

| Flow | Page / API |
|------|------------|
| Register + verify prompt | `/register` → `/check-email` |
| Verify email | `/verify-email?token=…`, `POST /api/auth/verify-email/confirm` |
| Resend verification | `POST /api/auth/verify-email/resend` |
| Forgot password | `/forgot-password`, `POST /api/auth/forgot-password` |
| Reset password | `/reset-password?token=…`, `POST /api/auth/reset-password` |
| Change password | `/settings/account`, `POST /api/account/change-password` |

**Vault separation:** changing or resetting the account password does **not** unlock, recover, or rotate the private letters vault. Users still need a trusted device, passkey, or recovery code for vault access.

**Email delivery** (account verification and password reset only — never private letter content):

| Mode | `EMAIL_PROVIDER` | Use |
|------|------------------|-----|
| Console debug | `console` | Logs links to server console; **never use in production** |
| Local SMTP (Mailpit) | `smtp` | Real delivery to [Mailpit](http://localhost:8025) |
| Staging / production | `smtp` | Brevo or other SMTP relay |

**Console (quick local debug):**

```bash
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@localhost
APP_BASE_URL=http://localhost:3001
```

**Mailpit (local real SMTP):**

```bash
docker compose up -d mailpit   # SMTP :1025, UI http://localhost:8025
```

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="Letters to God <noreply@localhost>"
APP_BASE_URL=http://localhost:3001
```

**Brevo SMTP (staging example — do not commit credentials):**

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<brevo-smtp-login>
SMTP_PASSWORD=<brevo-smtp-key>
EMAIL_FROM="Letters to God <noreply@yourdomain.com>"
APP_BASE_URL=https://your-staging-url
```

For real sending, configure SPF/DKIM/DMARC on your domain per your provider. Never commit SMTP credentials.

**Password policy:** see `.env.example` (`PASSWORD_POLICY_ENFORCEMENT=warn` by default). `enforce` blocks weak passwords; `warn` shows feedback only.

Run `npm run db:migrate` after pulling account-auth schema updates (`0006_account_email_verification_password_reset.sql`).

## Trusted devices

On `/vault/devices`, users can register the current browser storage profile (with an optional friendly name), rename devices, revoke access, and see **This device** when the local `clientDeviceId` matches an active registered entry.

A trusted device means a trusted browser storage profile, not a physical computer. Normal and incognito/private windows are different storage profiles and are treated as different trusted devices when they have different `clientDeviceId` values. The app does not silently relink trusted devices based on browser/platform/deviceType metadata.

Display metadata comes from `src/lib/device-display-info.ts` (browser, OS, form factor). Coarse metadata is display information only and must not be used as proof that two profiles are the same trusted device.

When the current profile is not registered and the vault is unlocked, the primary action is **Trust this browser** (creates a new server row and vault envelope). Re-registering the same active `clientDeviceId` is idempotent.

`last_used_at` updates automatically after each successful vault unlock.

## Commands

| Command | Description |
|---------|-------------|
| `npm ci` | Clean install from lockfile (CI / fresh checkout) |
| `npm run dev` | Start development server (port 3001) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (`eslint .`) |
| `npm run test` | Run all Vitest tests |
| `npm run test:coverage` | Vitest with coverage thresholds (≥90% lines/statements/functions/branches) |
| `npm run test:all` | Coverage tests, then Playwright E2E |
| `npm run test:e2e` | Browser E2E tests (Playwright; needs PostgreSQL + dev server) |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations to PostgreSQL |
| `docker compose up -d` | Start local PostgreSQL |

E2E browser install (once): `npx playwright install chromium`

E2E runs `npm run db:migrate` automatically via Playwright global setup (requires PostgreSQL and `DATABASE_URL` in `.env.local`).

Reuse an already-running dev server for E2E:

```bash
PLAYWRIGHT_REUSE_SERVER=true npm run test:e2e
```

## Testing

Tests are split by layer. Vitest runs everything under `src/test/`; Playwright runs `e2e/`.

| Type | Location | What it covers |
|------|----------|----------------|
| **Unit** | `src/test/unit/` | Crypto helpers, vault unlock, PRF/WebAuthn option preparation, validation, rate limits, API client, logger, env loading |
| **Security** | `src/test/security/` | Plaintext rejection, boundaries, sentinel phrase (static + runtime integration), AAD, WebAuthn challenges, audit redaction |
| **Services** | `src/test/services/` | Business logic with mocked repositories (letters, vault, passkeys, trusted devices, admin) |
| **API routes** | `src/test/api/` | Route handlers with mocked auth + services (letters, vault, passkeys, recovery, register, admin) |
| **Features** | `src/test/features/` | Client feature flows such as passkey unlock |
| **E2E** | `e2e/` | Full browser lifecycle: register → login → vault setup → write → list → edit → sign out |

Recent passkey-related coverage includes:

- PRF salt derivation (`src/test/security/passkey-prf.test.ts`)
- PRF support pre-check (`src/test/unit/prf-support.test.ts`)
- Passkey setup UX when PRF unavailable (`src/test/features/passkey-setup.test.tsx`)
- WebAuthn JSON → `ArrayBuffer` conversion for PRF extensions (`src/test/unit/prepare-webauthn-options.test.ts`)
- Passkey registration/authentication services and routes
- Passkey removal (`DELETE /api/passkeys`)

Coverage is enforced on core application code (`src/lib`, `src/server/services`, `src/server/policies`, `src/app/api`, `src/features/passkey`). Repository adapters and UI pages are covered indirectly via service/API/E2E tests.

```bash
npm ci                  # clean install
npm run lint            # ESLint
npm run test:coverage   # must pass before merge (≥90% lines/statements/functions/branches)
npm run build           # production build
npm run db:migrate      # apply migrations (requires PostgreSQL)
npm run test:all        # coverage + E2E smoke
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md), and [AGENTS.md](./AGENTS.md).

## Beta readiness

Before any **real beta**, complete the gates in [`docs/LGPD_BETA_GATES.md`](./docs/LGPD_BETA_GATES.md) and review [`docs/THREAT_MODEL_Private_Letters_Vault.md`](./docs/THREAT_MODEL_Private_Letters_Vault.md).

Production rate limiting: set `RATE_LIMIT_STORE=postgres` and run migrations (`rate_limit_buckets`, `0003_trusted_device_client_id_webauthn_indexes`).

**Account deletion:** `/settings/account` — requires phrase `DELETE MY ACCOUNT` and password re-auth (credentials accounts).

**Autosave:** explicitly disabled for MVP (encrypted autosave out of scope).

## Documentation

- [API Reference (Swagger / OpenAPI)](./docs/API_REFERENCE.md) — browse at `/api-docs` when running locally
- [TDR](./docs/TDR_Private_Letters_Vault_MVP_Revised.md)
- [ADR-001 Cryptography](./docs/ADR-001_Cryptographic_Payload_Format_and_Envelope_Encryption.md)
- [ADR-002 Vault Unlocking](./docs/ADR-002_Vault_Unlocking_Passkeys_Trusted_Devices_Recovery_Code.md)
- [ADR-003 API & Schema](./docs/ADR-003_API_Contract_Database_Schema_No_Plaintext_Enforcement.md)
