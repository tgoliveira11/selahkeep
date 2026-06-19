# Architecture — SelahKeep MVP

> **Product:** **SelahKeep** — private encrypted notes. Former working name: LTG Vault. [`docs/TDR_LTG_Vault_MVP.md`](./docs/TDR_LTG_Vault_MVP.md) is the source of truth; Phases 0–5 are complete per [`docs/LTG_VAULT_IMPLEMENTATION_PLAN.md`](./docs/LTG_VAULT_IMPLEMENTATION_PLAN.md).

## Stack

- **Frontend:** Next.js, TypeScript, React
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL
- **ORM:** Drizzle

## Modular monolith (Phase 1 + Phase 2)

This project uses an **internal modular monolith**. See `docs/MODULE_BOUNDARIES.md` and `docs/UTILITY_EXTRACTION_INVENTORY.md`.

- Business logic lives under `src/modules/{email,audit,rate-limit,security,vault,notes,ui}`.
- **Account auth** is not a local module — `@tgoliveira/secure-auth` via `src/lib/secure-auth.ts`.

See `docs/MODULE_BOUNDARIES.md` for responsibilities and forbidden cross-module imports.

## Layers

```text
React UI (src/app, src/components, src/features)
  -> Crypto Client Layer (`@tgoliveira/vault-core` + `src/modules/vault/`, note crypto in `src/lib/crypto-client/`)
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
    email/ audit/ rate-limit/ security/ vault/ notes/ ui/
  app/
    (public)/          # Landing, marketing
    (auth)/            # Login, signup
    (vault)/           # Notes, vault, settings
    api/               # REST API routes (thin; delegate to modules)
  components/          # App shell + domain components (migrating to modules)
    ui/                # Re-exports from modules/ui
    layout/            # SiteShell, Nav, SiteFooter, PageLayout
    notes/           # NoteCard
    notes/             # NoteCard
  features/            # Client feature flows (passkey, vault)
  lib/
    crypto-client/     # Note encryption + legacy shims re-exporting src/modules/vault
    modules/vault/     # Vault envelopes, session, passkey PRF (@tgoliveira/vault-core)
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
- WebAuthn challenge validation uses atomic `consumeValidChallenge()` only (`findValidChallenge` removed)
- WebAuthn challenge indexes: `idx_webauthn_challenges_lookup`, `idx_webauthn_challenges_expires_at`

- `POST/GET /api/notes`, `GET/PUT/DELETE /api/notes/:id` — encrypted notes (Markdown body, metadata blob)
- `GET/PATCH /api/vault/index` — encrypted vault index blob (v3: note lifecycle metadata, categories, tags, saved views, recently viewed)
- `GET/PATCH /api/vault/settings` — encrypted vault settings (unlock behavior, setup metadata)
- `POST/GET /api/notes`, `GET/PUT/DELETE /api/notes/:id` — encrypted note payloads only
- `POST /api/vault/setup` — vault-v2 setup (encrypted settings, index, password + recovery phrase envelopes); vault password validated client-side via `PasswordSetupFields` + `VAULT_PASSWORD_*` (never in request body)
- `POST /api/vault/init`, `GET /api/vault/status` — returns `hasVault`, `setupPhase`, `setupComplete`, and `availableUnlockMethods`; client derives `not_configured` / `setup_incomplete` / `locked` / `unlocked` via `useVaultClientStatus` + UVK session
- `POST /api/vault/unlock-envelope` — fetch encrypted envelope for password / recovery phrase unlock
- `GET/POST /api/vault/security-events` — list and record safe vault security audit events (no secrets)
- `POST /api/vault/recovery-phrase` — replace recovery phrase envelope (atomic revoke + create; client-side UVK wrap)
- `POST /api/recovery-code`, `POST /api/vault/unlock-with-recovery-code` — legacy recovery code only
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
- `GET /api/account/sessions`, `DELETE /api/account/sessions/:id`, `POST /api/account/sessions/revoke-others`, `POST /api/account/sessions/revoke-all`, `POST /api/account/sessions/ping` — account session management (not vault unlock)

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
- Password policy: `buildSecureAuthConfigFromEnv` → `@tgoliveira/secure-auth` (`passwordPolicy` + `secureAuth.uiConfig.passwordPolicy`); resolved by `@tgoliveira/secure-auth/client/password-policy` on the client
- UI: `(auth)/register`, `reset-password` (package pages); account settings uses package `ChangePasswordSettings` inside `SecureAuthUIProvider`

Changing or resetting the account password does **not** unlock, recover, or rotate the vault.

## Envelope Encryption

```text
Note metadata/body -> Note Key -> User Vault Key -> vault envelopes
Note metadata/body -> Note Key -> User Vault Key
Vault index (titles for list) -> User Vault Key
```

Vault envelope methods (LTG): `password`, `recovery_phrase`, `passkey_prf` (+ legacy `recovery_code` for vault-v1). Trusted devices were removed — see `docs/TRUSTED_DEVICES_REMOVAL.md`.

## UI layer

- **Design docs:** `docs/UI_UX_DIRECTION.md`, `docs/LOGGED_IN_NAVIGATION_AUDIT.md`
- **Layout:** `AuthenticatedPage` + `PageLayout` width tokens (`settings` 800px, `notes` 920px, `editor` 880px); see `src/lib/ui/authenticated-layout.ts` and `docs/UI_UX_DIRECTION.md`
- **Authenticated UI patterns:** `PageHeader`, `ToolbarButton`, `NotesListControls`, `SmartFilterChips`, `NotesListGrid`, `SettingsSection`
- **Public marketing:** Home page sections and copy in `src/lib/marketing/home-copy.ts`
- **Vault setup:** `/vault/setup` — `PasswordSetupFields` (secure-auth) + BIP39 recovery phrase wizard; policy from `src/lib/config/vault-password-policy.ts`
- **Recovery management:** `/vault/recovery` — status-gated recovery phrase replace (no initial phrase generation post-setup); link to `/vault/settings` for optional passkey vault unlock
- **Passkey vault unlock:** `/vault/settings` — `PasskeyVaultUnlockSetup`; PRF diagnostics in `src/lib/passkey/passkey-prf-diagnostics.ts`
- **Vault security review:** `/vault/security` — health summary, protection indicators, local recovery phrase drill (`verifyRecoveryPhraseDrill`), passkey compatibility guide, safe audit event log (`GET/POST /api/vault/security-events`); see `docs/VAULT_SECURITY_REVIEW_IMPLEMENTATION.md`
- **Vault unlock:** `VaultDockQuickUnlock` in `VaultStatusDock` (vault password + passkey PRF when available); full `LtgVaultUnlockPanel` on `/vault/unlock` (password, recovery phrase, passkey PRF). Dock links to full page for recovery/fallback; no duplicate unlock form on `/vault/unlock`. Collapsed handle shows `Vault` or countdown; expanded open state is compact with **Lock now**; auto-collapse via `useVaultDockDismiss`.
- **Tokens:** CSS variables in `src/app/globals.css` (calm neutral + **purple** primary)
- **Security UX:** no plaintext notes in URLs/API; recovery phrase client-only; sanitized Markdown preview; visual note editor (Tiptap) with Markdown canonical storage — see [`docs/EDITOR_EXPERIENCE_TRACK_2_IMPLEMENTATION.md`](./docs/EDITOR_EXPERIENCE_TRACK_2_IMPLEMENTATION.md); encrypted IndexedDB drafts; quick insert, focus mode, daily note; tag normalization before encrypted index write

## AAD binding (ADR-005)

Client generates note UUIDs and binds encrypted payloads with AAD:

- `aad.userId` — authenticated user ID
- `aad.resourceId` — note or vault resource ID
- `aad.field` — encrypted field name (`note_metadata`, `note_body`, `note_key`, `vault_key`, etc.)

Server validates AAD in `src/server/policies/aad-validation.ts` before storage. Client verifies AAD in `src/lib/crypto-client/aad-verify.ts` before decryption.

## Database transactions

Multi-step sensitive flows use `runInTransaction()` (`src/lib/db/transaction.ts`):

- vault initialization and LTG setup
- recovery phrase replace (`POST /api/vault/recovery-phrase`)
- legacy recovery code store/regenerate (`POST /api/recovery-code`)
- passkey register/remove

Failures roll back all related writes.

## Passkey account sign-in

Account passkey sign-in is owned by `@tgoliveira/secure-auth` (`LoginPage`, `signInWithPasskey` from `@tgoliveira/secure-auth/react/client` via vault shim).

Product-specific vault PRF enrichment remains on `POST /api/auth/passkey/login/options` via `passkeyLoginVaultService`. Verify delegates to `secureAuth.routes.passkeyLoginVerify` (no vault enrichment). Post-login auto-unlock is implemented in `src/features/passkey/passkey-login-with-vault-unlock.ts`, wired through `src/lib/secure-auth/vault-passkey-react-client.ts` (Next/Vitest alias). Vault metadata is fetched from `POST /api/auth/passkey/login/vault-unlock/metadata` (loginToken-gated). Manual unlock and second-ceremony PRF use `/vault/unlock` and `POST /api/auth/passkey/login/vault-unlock/options`. Per-passkey enable/status/revoke: `enable-vault-unlock`, `GET/DELETE .../vault-unlock`.

See [`docs/AUTH_RESET_TO_SECURE_AUTH.md`](./docs/AUTH_RESET_TO_SECURE_AUTH.md) and [`docs/PASSKEY_LOGIN_VAULT_UNLOCK.md`](./docs/PASSKEY_LOGIN_VAULT_UNLOCK.md).

## Account two-factor authentication

TOTP 2FA is **account authentication only** — provided by `@tgoliveira/secure-auth` (settings UI, API routes, login `/login/2fa` flow).

Passkey sign-in follows package rules when 2FA is enabled (pending challenge until TOTP verified).

- Settings UI: `/settings/account` (`AccountSettingsPage` from package + product recovery links)
- Login challenge: `/login/2fa` (app integration: `OAuthTwoFactorChallenge` for OAuth, package `CredentialsTwoFactorForm` for credentials) + `src/proxy.ts` gate for partial sessions with safe `callbackUrl` preservation
- Storage: `user_two_factor_settings`, `user_two_factor_backup_codes`, login challenge/token tables
- NextAuth provider: `login-token` (one-time token after password + optional 2FA)

## API Routes (additional)

- `DELETE /api/account` — account deletion (cascades encrypted user data)

## Rate limiting

`src/server/policies/rate-limit/` — adapter interface, in-memory (dev/test) and PostgreSQL (production via `RATE_LIMIT_STORE=postgres`).

## Audit events

`src/server/policies/audit-sanitization.ts` + `audit-repository.ts` — non-sensitive audit trail.

## Vault session

`src/lib/vault/vault-auto-lock-config.ts` — configurable inactivity timeout (default 15 min).

`src/modules/vault/client/vault-session.ts` — SelahKeep auto-lock extensions on vault-core memory session: `registerVaultBeforeAutoLock`, manual vs inactivity lock (`wasVaultLockedByInactivity`), note body cache clear on lock, unload guard, `getVaultAutoLockRemainingMs()` for dock countdown.

`src/features/vault/use-vault-activity.ts` — activity listeners + `touchVaultActivity()` for editor paths.

`src/features/vault/vault-locked-state.tsx` — normalized locked-state UI per route context.

See [`docs/VAULT_AUTO_LOCK_NORMALIZATION.md`](./docs/VAULT_AUTO_LOCK_NORMALIZATION.md).

## Beta documentation

- [`docs/THREAT_MODEL_Private_Letters_Vault.md`](./docs/THREAT_MODEL_Private_Letters_Vault.md)
- [`docs/LGPD_BETA_GATES.md`](./docs/LGPD_BETA_GATES.md)
- [`docs/BACKUP_RESTORE_POLICY.md`](./docs/BACKUP_RESTORE_POLICY.md)
