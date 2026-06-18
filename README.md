# SelahKeep — Private Encrypted Notes MVP

> **Product:** **SelahKeep** — a private encrypted space for prayers, reflections, and notes. Former working name: LTG Vault. Primary UI accent: **purple** (`docs/UI_UX_DIRECTION.md`). Vault setup: `/vault/setup` (vault password + BIP39 recovery phrase). See [`docs/TDR_LTG_Vault_MVP.md`](./docs/TDR_LTG_Vault_MVP.md) and [`docs/LTG_VAULT_IMPLEMENTATION_PLAN.md`](./docs/LTG_VAULT_IMPLEMENTATION_PLAN.md).

Web-first responsive MVP for private encrypted notes in a personal vault.

## Privacy Promise

> Your private notes are protected on your device before they are saved. Our systems are designed so our team does not have access to the keys required to read them.

## Stack

- Next.js + TypeScript + React
- PostgreSQL + Drizzle ORM
- **Account authentication:** [`@tgoliveira/secure-auth@0.1.19-internal`](https://www.npmjs.com/package/@tgoliveira/secure-auth) (experimental 0.1.x — security review before production)
- Web Crypto API (AES-GCM) + Argon2id recovery KDF
- WebAuthn passkeys (@simplewebauthn) — vault unlock via PRF is app-specific; account sign-in passkeys are provided by secure-auth

Account auth env vars are documented in `.env.example` (`AUTH_*` names). **Vercel deploy:** see [`docs/VERCEL_ENVIRONMENT_VARIABLES.md`](./docs/VERCEL_ENVIRONMENT_VARIABLES.md). Health check after starting the dev server:

```bash
curl http://localhost:3001/api/auth/package-health
```

Migration history (archived): [`docs/AUTH_RESET_TO_SECURE_AUTH.md`](./docs/AUTH_RESET_TO_SECURE_AUTH.md), [`docs/archive/migrations/secure-auth-migration-report.md`](./docs/archive/migrations/secure-auth-migration-report.md).

Documentation index: [`docs/README.md`](./docs/README.md).

## Quick Start

```bash
# Install dependencies (CI / clean checkout)
npm ci

# Start PostgreSQL
docker compose up -d

# Configure environment (required for migrations and the app)
cp .env.example .env.local
# Ensure DATABASE_URL is set in .env.local, e.g.:
# DATABASE_URL=postgresql://letters:letters_dev@localhost:5435/letters_to_god
# NEXTAUTH_URL=http://localhost:3001
# TWO_FACTOR_SECRET_ENCRYPTION_KEY=<openssl rand -base64 32>  # required for account 2FA

# Generate and run migrations (reads .env.local automatically)
npm run db:generate   # after schema changes
npm run db:migrate    # required after pulling schema updates

# Start dev server (port 3001)
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## UI / UX

Design direction and navigation:

- [`docs/UI_UX_DIRECTION.md`](./docs/UI_UX_DIRECTION.md) — tone, purple brand, public page sections
- [`docs/LOGGED_IN_NAVIGATION_AUDIT.md`](./docs/LOGGED_IN_NAVIGATION_AUDIT.md) — logged-in nav structure
- [`docs/README.md`](./docs/README.md) — documentation index

Shared UI components live under `src/components/ui/`. Route groups `(public)`, `(auth)`, and `(vault)` wrap pages in `SiteShell` (header + footer). Page content uses `PageLayout` for width and spacing.

## API reference (Swagger UI)

Browse REST endpoints in Swagger UI during local development:

1. Run `npm run dev`
2. Open [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
3. Sign in to the app in the **same browser** before trying authenticated routes

OpenAPI spec: `docs/openapi.yaml` (JSON at `GET /api/openapi`). Full details: [docs/API_REFERENCE.md](./docs/API_REFERENCE.md).

Production hides `/api-docs` unless `ENABLE_API_DOCS=true` in `.env.local`.

## Passkeys (sign-in and vault unlock)

- **Sign in with passkey** on `/login` — phishing-resistant account authentication; does not require TOTP even when 2FA is enabled
- **Account settings → Passkeys** — register sign-in passkeys (package)
- **`/vault/settings` → Passkey vault unlock** — enable, test, replace, or disable vault unlock per account passkey (requires unlocked vault + WebAuthn PRF)
- **`/vault/recovery`** — recovery phrase management; optional link to vault settings for passkey vault unlock
- **Passkey sign-in** may auto-unlock the vault when a compatible PRF envelope exists; otherwise you remain signed in and are guided to `/vault/unlock`
- Details: [`docs/PASSKEY_LOGIN_VAULT_UNLOCK.md`](docs/PASSKEY_LOGIN_VAULT_UNLOCK.md)

Run `npm run db:migrate` after pulling passkey account-auth schema updates (`0005_passkey_account_authentication.sql`).

## Two-factor authentication (optional)

Account-level TOTP 2FA can be enabled from **Account settings**. It adds an extra sign-in code when signing in with **email and password** and does **not** replace vault password, recovery phrase, or passkey vault unlock. **Passkeys** use device verification and do not require a separate one-time code for account sign-in.

Requires `TWO_FACTOR_SECRET_ENCRYPTION_KEY` in `.env.local` (see `.env.example`). Run `npm run db:migrate` after pulling 2FA schema updates.

## GitHub sign-in (account authentication only)

GitHub sign-in uses the NextAuth **GitHub** provider. It authenticates the **account only** — it does **not** unlock the vault.

| Setting | Value |
|---------|--------|
| Provider ID | `github` |
| Env vars | `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET` (legacy `GITHUB_*` also supported) |
| Local callback | `http://localhost:3001/api/auth/callback/github` |

**GitHub OAuth app (summary)**

1. [GitHub Developer settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**.
2. **Authorization callback URL** must match exactly (local example): `http://localhost:3001/api/auth/callback/github`
3. Copy **Client ID** and generate a **Client secret** → set env vars in `.env.local`, restart the app.
4. Verify: `curl http://localhost:3001/api/auth/providers` should include a `github` entry.

## Microsoft sign-in (account authentication only)

Microsoft sign-in uses the NextAuth **Azure AD** provider (`azure-ad`) against Microsoft Entra ID / the Microsoft identity platform. It authenticates the **account only** — it does **not** unlock the private notes vault or replace passkey PRF vault unlock or the recovery phrase.

| Setting | Value |
|---------|--------|
| Provider ID | `azure-ad` |
| Scopes | `openid`, `email`, `profile` only (no Microsoft Graph mail/calendar/files scopes) |
| Env vars | `AUTH_AZURE_AD_ID` (Application/client ID **GUID**), `AUTH_AZURE_AD_SECRET` (client secret value), `AUTH_AZURE_AD_TENANT_ID` (default `common`) |
| Local callback | `http://localhost:3001/api/auth/callback/azure-ad` |

**Microsoft Entra app registration (summary)**

1. [Microsoft Entra admin center](https://entra.microsoft.com/) → **App registrations** → **New registration**.
2. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** if using `AUTH_AZURE_AD_TENANT_ID=common` (alternatives: `consumers`, `organizations`, or a specific tenant GUID).
3. **Authentication** → add **Web** platform redirect URIs (must match exactly; do not use SPA-only for this server-side flow):
   - Local: `http://localhost:3001/api/auth/callback/azure-ad`
   - Staging: `https://<staging-host>/api/auth/callback/azure-ad`
   - Production: `https://<production-host>/api/auth/callback/azure-ad`
   - The app enables PKCE automatically (required by Microsoft Entra for code redemption).
4. **Certificates & secrets** → create a client secret → set `AUTH_AZURE_AD_SECRET` (never commit).
5. Set env vars in `.env.local`, restart the app.

**Account linking:** no automatic linking across providers. If an email is already registered with email/password (or another OAuth provider), Microsoft sign-in is rejected with a safe error.

**OAuth + TOTP:** when account 2FA is enabled, OAuth sign-in (Google, Apple, GitHub, Microsoft) receives a partial session until `/login/2fa` + `POST /api/auth/login/verify-2fa-oauth` completes. Passkey sign-in bypasses TOTP.

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
| Passkeys & TOTP 2FA | `/settings/account#security` (package `PasskeySettings`, `TwoFactorSettings`) |

**Vault separation:** changing or resetting the account password does **not** unlock, recover, or rotate your vault. Users still need a vault password, recovery phrase, or passkey PRF for vault access.

**Vault client status** (`GET /api/vault/status` + in-browser UVK session):

| Status | Meaning | Primary CTA |
|--------|---------|-------------|
| `not_configured` | Signed in, no vault record | Set up vault → `/vault/setup` |
| `setup_incomplete` | Vault record started, missing required pieces | Continue setup → `/vault/setup` |
| `locked` | Setup complete, UVK not in this browser session | Unlock vault → `/vault/unlock` |
| `unlocked` | Setup complete, UVK in session | Lock vault on `/notes` vault indicator (not top nav) |

`/notes` and `/vault/settings` show state-specific prompts instead of unlock panels when no vault exists.

**Vault setup password UI:** `/vault/setup` uses `PasswordSetupFields` from `@tgoliveira/secure-auth` with an app-owned vault password policy (`VAULT_PASSWORD_*` env vars → `src/lib/config/vault-password-policy.ts`). The vault password is validated client-side only and never sent to the server; Argon2id wraps the User Vault Key after validation.

**Vault inactivity lock:** while the vault is unlocked, **15 minutes** of no click, pointer, keyboard, input, focus, scroll, or touch activity auto-locks the vault, clears decrypted note bodies from memory, and shows: *“Your vault was locked to protect your private notes.”* Manual **Lock vault** on the `/notes` vault indicator has the same effect without the banner. The top navigation no longer shows vault lock/status controls — only Notes, Vault, Account, and Sign out.

**Import / export:** bulk import and export of decrypted notes are **not available** in this MVP. See `/vault/settings` and the public home page.

**Account deletion:** permanently removes your vault, all encrypted notes, vault envelopes, and passkey credentials. Warnings appear on `/settings/account` before deletion.

**Email delivery** (account verification and password reset only — never private note content):

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
EMAIL_FROM="SelahKeep <noreply@localhost>"
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
EMAIL_FROM="SelahKeep <noreply@selahkeep.com>"
APP_BASE_URL=https://your-staging-url
```

For real sending, configure SPF/DKIM/DMARC on your domain per your provider. Never commit SMTP credentials.

**Password policy:** set `AUTH_PASSWORD_MIN_LENGTH` (preferred) or `PASSWORD_MIN_LENGTH` in `.env.local`. The value is passed once into `@tgoliveira/secure-auth` through `buildSecureAuthConfigFromEnv` and exposed to all package password forms (register, reset, change password) via `SecureAuthUIProvider`. Default minimum length is **12** when unset. Do not hardcode password rules in local UI components.

Run `npm run db:migrate` after pulling account-auth schema updates (`0006_account_email_verification_password_reset.sql`).

## Active sessions

From **Account settings → Active sessions**, users can see browsers/devices signed in to the account, revoke one session, sign out of all other sessions, or sign out everywhere.

Account sessions are separate from **vault unlock**. Revoking a session signs out the account on that browser; it does not unlock the vault.

Run `npm run db:migrate` after pulling session schema updates (`0007_account_sessions.sql`).

Run `npm run db:migrate` after pulling vault schema updates (`0008`–`0011`, including `0010_drop_letters.sql` and `0011_drop_trusted_devices.sql`).

## Notes (SelahKeep Phase 2–3)

Primary UI: **`/notes`**, **`/notes/new`**, **`/notes/:id`**, **`/vault/settings`**.

- **Resolved status** — user-facing “resolved” maps to internal encrypted `answered` metadata; icon toggle on list cards and detail view; edit-mode toggle in category fields; filters use resolved/unresolved
- **Note editor** — polished visual editor card (grouped toolbar, canvas, status) by default via Tiptap; Markdown remains canonical encrypted body; discreet **Markdown** toggle for source + collapsible preview. See `docs/EDITOR_UI_UX_REDESIGN_DECISION.md`.
- **Notes list** — created + updated dates on every card, sort (last modified/created/title), filtered counter (`4 of 12 notes`), resolved/unresolved badges
- **Vault indicator** on `/notes` and `/notes/[id]` — open/closed state with real inactivity countdown (`Auto-locks in 14:32`); lock control here only (not top nav); unlock links preserve safe `returnTo` for post-unlock navigation (`/notes`, `/vault/settings`, `/vault/recovery`, `/settings/account`)
- **Encrypted local drafts** — autosaved in IndexedDB wrapped by User Vault Key (`note_draft` field); never plaintext
- **Title required** on `/notes/new` (trimmed, non-empty); still encrypted in metadata at rest
- **Encrypted metadata** (title, category, tags, answered) + **encrypted body** per note
- **Answered** marker on list/detail icon toggle and edit fields; new notes default to `answered: false`
- **Vault index v2** (`GET/PATCH /api/vault/index`) — note entries plus encrypted category/tag definitions
- **Tags** normalized client-side (`normalizeTagInput`, max **32** chars); displayed with `#`, stored without `#`
- **Category vs tags:** category pill (no `#`); tag chips with `#`
- **Client-side search/filters** after unlock — shown only when at least one category or tag exists; no server search
- **Vault status on notes pages:** `NotesVaultIndicator` on `/notes` and `/notes/[id]` — closed vault visual + unlock CTA when locked (no decrypted content on detail); open vault visual + inactivity countdown + manual lock when unlocked
- **Unlock behavior** (`GET/PATCH /api/vault/settings`): `metadata_only` (default) or `decrypt_all`
- **API:** `POST/GET /api/notes`, `GET/PUT/DELETE /api/notes/:id` — encrypted payloads only
- **Removed (Phase 3):** `/letters`, `/api/letters`, `letters` table

## Deploy (Vercel)

See [`docs/VERCEL_ENVIRONMENT_VARIABLES.md`](./docs/VERCEL_ENVIRONMENT_VARIABLES.md) and [`docs/archive/migrations/secure-auth-deployment-checklist.md`](./docs/archive/migrations/secure-auth-deployment-checklist.md).

**Production requirements:**

- `DATABASE_URL`, `NEXTAUTH_SECRET`, `TWO_FACTOR_SECRET_ENCRYPTION_KEY`, `APP_BASE_URL`
- `EMAIL_PROVIDER=smtp` with `EMAIL_FROM` — **never** `EMAIL_PROVIDER=console` in production
- OAuth callback URLs: `{APP_BASE_URL}/api/auth/callback/{provider}`
- Run `npm run db:migrate` before serving traffic
- MVP acceptance: [`docs/LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md`](./docs/LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md)

## Commands

| Command | Description |
|---------|-------------|
| `npm ci` | Clean install from lockfile (CI / fresh checkout) |
| `npm run dev` | Start development server (port 3001) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (`eslint .`) |
| `npm run test` | Run all Vitest tests |
| `npm run test:coverage` | Vitest with coverage thresholds (≥90% lines/statements/functions/branches) |
| `npm run test:all` | Alias for `npm run test:coverage` |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations to PostgreSQL |
| `docker compose up -d` | Start local PostgreSQL |

## Testing

All tests run through **Vitest** (`src/test/`). Browser E2E (Playwright) was intentionally removed; see `docs/TESTING_STRATEGY.md`.

| Type | Location | What it covers |
|------|----------|----------------|
| **Unit** | `src/test/unit/` | Crypto helpers, vault unlock, PRF/WebAuthn option preparation, validation, rate limits, API client, logger, env loading |
| **Security** | `src/test/security/` | Plaintext rejection, boundaries, sentinel phrase (static + runtime integration), AAD, WebAuthn challenges, audit redaction |
| **Services** | `src/test/services/` | Business logic with mocked repositories (notes, vault, passkeys, admin) |
| **API routes** | `src/test/api/` | Route handlers with mocked auth + services (notes, vault, passkeys, recovery, register, admin) |
| **Features** | `src/test/features/` | Client feature flows (passkey unlock, site layout shell, UI pages, accessibility) |

Recent passkey-related coverage includes:

- Passkey login + vault unlock integration (`docs/PASSKEY_LOGIN_VAULT_UNLOCK.md`, `src/test/security/passkey-login-vault-unlock.test.ts`)
- PRF salt derivation (`src/test/security/passkey-prf.test.ts`)
- PRF support pre-check (`src/test/unit/prf-support.test.ts`)
- Passkey setup UX when PRF unavailable (`src/test/features/passkey-setup.test.tsx`)
- Passkey vault unlock settings (`src/test/features/passkey-vault-unlock-settings.test.tsx`)
- PRF diagnostics (`src/test/unit/passkey-prf-diagnostics.test.ts`, `docs/PASSKEY_VAULT_UNLOCK_DIAGNOSTIC_AUDIT.md`)
- WebAuthn JSON → `ArrayBuffer` conversion for PRF extensions (`src/test/unit/prepare-webauthn-options.test.ts`)
- Passkey registration/authentication services and routes
- Passkey removal (`DELETE /api/passkeys`)

Coverage is enforced on core application code (`src/lib`, `src/server/services`, `src/server/policies`, `src/app/api`, `src/features/passkey`). Repository adapters and UI pages are covered indirectly via service/API/feature tests.

```bash
npm ci                  # clean install
npm run lint            # ESLint
npm run test:coverage   # must pass before merge (≥90% lines/statements/functions/branches)
npm run build           # production build
npm run db:migrate      # apply migrations (requires PostgreSQL)
npm run test:all        # coverage + E2E smoke
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md), [AGENTS.md](./AGENTS.md), and [docs/UTILITY_EXTRACTION_INVENTORY.md](./docs/UTILITY_EXTRACTION_INVENTORY.md) (Phase 2 internal utilities).

## Beta readiness

Before any **real beta**, complete the gates in [`docs/LGPD_BETA_GATES.md`](./docs/LGPD_BETA_GATES.md) and review [`docs/THREAT_MODEL_Private_Letters_Vault.md`](./docs/THREAT_MODEL_Private_Letters_Vault.md).

Production rate limiting: set `RATE_LIMIT_STORE=postgres` and run migrations (`rate_limit_buckets`, WebAuthn indexes in `0003_*`).

**Account deletion:** `/settings/account` — requires phrase `DELETE MY ACCOUNT` and password re-auth (credentials accounts).

**Autosave:** explicitly disabled for MVP (encrypted autosave out of scope).

## Documentation

See [`docs/README.md`](./docs/README.md) for the full index. Active source of truth:

- [TDR — SelahKeep MVP](./docs/TDR_LTG_Vault_MVP.md)
- [ADR-005 — Vault crypto & note keys](./docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md)
- [ADR-006 — Passkey PRF unlock](./docs/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md)
- [MVP acceptance checklist](./docs/LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md)
- [API Reference (Swagger / OpenAPI)](./docs/API_REFERENCE.md)

Historical ADRs and the pre–SelahKeep TDR are in [`docs/archive/`](./docs/archive/).
