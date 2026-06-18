# Security — SelahKeep MVP

> **Product:** SelahKeep (former working name: LTG Vault). **Source of truth:** [`docs/TDR_LTG_Vault_MVP.md`](./docs/TDR_LTG_Vault_MVP.md), [`docs/ADR-005_*`](./docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md), [`docs/ADR-006_*`](./docs/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md). Phases 0–5 complete.

## Privacy Promise

> Your private notes are protected on your device before they are saved. Our systems are designed so our team does not have access to the keys required to read them.

## Non-Negotiable Rules

1. Private note title, body, and metadata encrypted in the browser before API requests.
2. Backend receives only structured encrypted payloads.
3. User Vault Key generated on client; never sent in plaintext.
4. Per-note keys encrypted by User Vault Key.
5. Recovery phrase never leaves the browser; recovery codes (legacy) never stored in plaintext.
6. No plaintext keys or note content in localStorage, sessionStorage, cookies, URLs, logs, or analytics.
7. No AI processing of private notes.
8. No admin access to private note content.
9. No Server Actions for note persistence.
10. Frontend must not access database directly.
11. Account authentication from `@tgoliveira/secure-auth` only — no competing local auth.
12. Account session does not unlock the vault.

## Cryptography (ADR-005)

- AES-GCM, 256-bit keys, 96-bit random IV per operation
- Structured payload: `version`, `alg`, `iv`, `ciphertext`, `aad`
- **AAD binding (server + client):** `aad.userId` must match session user; `aad.resourceId` must match persisted note/vault id; `aad.field` must match the encrypted field.
- **Note IDs:** client generates UUID; server persists the same id.
- **vault password KDF (new setups):** Argon2id only via `hash-wasm` — no PBKDF2 fallback (`src/lib/crypto-client/vault-kdf.ts`, ADR-005)
- **Vault password policy (setup UI):** `VAULT_PASSWORD_*` env vars mapped in `src/lib/config/vault-password-policy.ts` and passed explicitly to `PasswordSetupFields` on `/vault/setup`. Separate from account `AUTH_PASSWORD_*` policy. Vault password never leaves the browser.
- **recovery phrase (new setups):** BIP39 English, 12 or 24 words (`src/lib/crypto-client/recovery-phrase.ts`)
- **Legacy recovery code KDF:** Argon2id preferred; PBKDF2-SHA-256 fallback (600k iterations) with versioned `kdf-v1` metadata — legacy `recovery_code` envelopes only
- Recovery codes: ≥128 bits entropy (project-specific wordlist, not BIP39; currently 17 words from 252 unique words ≈ 135.6 bits); uniform word selection + rejection sampling; shown only at generation/regeneration; never stored plaintext

## Vault Unlocking (ADR-005 / ADR-006)

Supported unlock methods: **vault password**, **recovery phrase**, **passkey PRF** (`passkey_authorized_device` envelope). Legacy `recovery_code` envelopes remain for older vaults.

- Passkeys must not be used as raw encryption keys
- Account session alone never unlocks the vault
- Passkey PRF unlock does not cache a local device-secret envelope
- On load, `purgeTrustedDeviceIdb()` removes legacy `device_secrets` / `vault_envelopes` IndexedDB stores (trusted devices removed — see `docs/TRUSTED_DEVICES_REMOVAL.md`)

## Database transactions

Multi-step sensitive flows use `runInTransaction()` (vault init/setup, recovery phrase replace, legacy recovery code store, passkey register/remove). Failures roll back related writes.

## Browser Storage (IndexedDB)

SelahKeep does not persist vault unlock material in IndexedDB. Legacy trusted-device stores are deleted on upgrade to DB version 3 (`src/lib/crypto-client/vault-idb-cleanup.ts`).

Forbidden in browser persistence:

- Plaintext User Vault Key, Note Key, recovery phrase, recovery code, or note title/body
- Exportable/raw device secret strings

### Threat model (local storage)

| Threat | Mitigation |
|--------|------------|
| **XSS on this origin** | Nonce-based CSP in `src/proxy.ts` (`script-src 'self' 'nonce-…' 'strict-dynamic' 'wasm-unsafe-eval'`); `wasm-unsafe-eval` is required for client-side Argon2 (`hash-wasm`) on recovery flows |
| **Stolen session cookie only** | Server stores ciphertext only; unlock still requires vault password, recovery phrase, or passkey PRF |
| **Sign out on shared device** | `clearVaultClientState()` clears in-memory vault key and purges legacy IndexedDB stores |

Residual risk: a malicious script running on this origin (XSS) or compromised browser profile on an unlocked session can still decrypt notes. That is inherent to client-side encryption; depth-in-defense is CSP + minimal persistence + Markdown sanitization on preview.

## Notes (Phase 2–3)

- Note title lives in **encrypted metadata** (`note_metadata` AAD); body is Markdown encrypted under Note Key (`note_body` AAD).
- Note Key is wrapped by User Vault Key (`note_key` AAD) — never sent to API in plaintext.
- Vault index (list titles, categories, tags, lifecycle flags, saved views) is client-encrypted under UVK; server stores ciphertext only.
- Category and tag **names** live only in the encrypted vault index (v3); never in database columns or API plaintext fields.
- Note lifecycle fields (`pinned`, `favorite`, `archived`, `trashed`, `trashedAt`) live only in encrypted note metadata and vault index — not in database columns.
- Answered status is stored only in encrypted note metadata and vault index — not in database columns.
- **Search and filters** run client-side in memory after vault unlock; there is no server search endpoint and queries never leave the browser.
- **Note titles** are required on create in the UI; title text remains in encrypted metadata only.
- **Tags** are normalized before storage (`src/lib/notes/tag-normalization.ts`, max length **32**); `#` is display-only.
- **Answered** defaults to `false` on create; only editable on note detail/edit.
- Vault setting `unlockBehavior`: `metadata_only` (default) or `decrypt_all` (eager body decrypt after unlock) — stored in encrypted vault settings.
- User-facing note status is **resolved**; encrypted metadata/index still use internal field name `answered` (legacy naming).
- Note drafts autosave locally as **encrypted** payloads (`note_draft` AAD) in IndexedDB; plaintext title/body/tags are never persisted.
- Markdown preview/detail use `marked` + `dompurify` allowlist via `MarkdownPreview` before `dangerouslySetInnerHTML`.
- Visual note editor (Tiptap) keeps **Markdown as canonical body**; pasted HTML is sanitized client-side (`editor-paste.ts`); only `http(s)` links accepted in-editor. HTML is never sent to APIs.
- Unsafe HTML/scripts and `javascript:` links are stripped; external links use `rel="noopener noreferrer"`.
- Note APIs reject plaintext `title`, `body`, `markdown`, `tags`, `categoryId`, `categoryName`, `tagNames`, `answered`, `pinned`, `favorite`, `archived`, `trashed`, `noteKey`, etc.
- Trash moves notes client-side (encrypted metadata); permanent delete uses server soft delete (`deleted_at` on notes). Trash auto-purge not implemented.
- No plaintext search or lifecycle indexes on the server.

Letters domain removed in Phase 3 (`letters` table dropped via `0010_drop_letters.sql`).

## Observability

Never log: plaintext title/body, User Vault Key, Letter Key, Note Key, recovery code, decrypted payloads.

Error tracking must strip request/response bodies and sensitive headers.

## Threat Model & Beta Gates

- Formal threat model: [`docs/THREAT_MODEL_Private_Letters_Vault.md`](./docs/THREAT_MODEL_Private_Letters_Vault.md)
- LGPD / privacy beta gates: [`docs/LGPD_BETA_GATES.md`](./docs/LGPD_BETA_GATES.md)
- Backup/restore draft: [`docs/BACKUP_RESTORE_POLICY.md`](./docs/BACKUP_RESTORE_POLICY.md)

## Two-factor authentication (account sign-in)

Optional TOTP 2FA protects **account sign-in only**. It does **not** decrypt private letters, replace the vault recovery code, unlock the vault, or wrap vault keys.

- Off by default; enabled from `/settings/account`
- Standard TOTP (Google Authenticator, Microsoft Authenticator, 1Password, Authy, etc.)
- TOTP secrets encrypted at rest with AES-256-GCM (`TWO_FACTOR_SECRET_ENCRYPTION_KEY`, payload version `tf-v1`)
- Backup codes generated on enable; hashed (SHA-256 + pepper) and one-time use; shown once
- Credentials login: `POST /api/auth/login/start` → optional `POST /api/auth/login/verify-2fa` → one-time `login-token` NextAuth provider
- Passkey login: `POST /api/auth/passkey/login/options` → `POST /api/auth/passkey/login/verify` → one-time `login-token` NextAuth provider (**TOTP not required**, even when 2FA is enabled)
- OAuth login (Google, Apple, Microsoft): partial session until `POST /api/auth/login/verify-2fa-oauth` + session upgrade token; `src/proxy.ts` blocks app routes until verified; app waits for JWT refresh before post-2FA redirect (see [`docs/TWO_FACTOR_MOBILE_FLOW_AUDIT.md`](docs/TWO_FACTOR_MOBILE_FLOW_AUDIT.md))
- Rate limits: setup verify, login verify, disable, backup regeneration
- Audit events never include TOTP secrets, codes, or backup codes

## Authentication passwords

Credentials passwords are **never stored in plaintext** and are **not reversibly encrypted**. The server stores a **bcrypt one-way hash** in `users.password_hash` (cost factor **12**). Hashing is owned by `@tgoliveira/secure-auth` — the app does not implement local password hashing.

### Transport (API)

- Passwords may appear **only transiently** in **HTTPS POST/DELETE JSON bodies** for registration, NextAuth credentials login, and account-deletion re-auth
- Passwords must **never** be sent in URLs, query strings, path segments, or API responses
- `assertPasswordNotInUrl()` rejects query-string password attempts on auth routes
- Registration and account deletion responses never include `password` or `password_hash`

### Verification (server-only)

- Registration: `hashPassword()` on the server, then persist digest only
- Login: `POST /api/auth/login/start` verifies password via `verifyPassword()` → `bcrypt.compare()` against `password_hash`; optional 2FA before one-time `login-token` NextAuth provider
- Account deletion: `verifyPassword()` for credentials accounts
- The client must **not** compare passwords for authentication; it only collects the value and sends it over HTTPS

Plaintext passwords are redacted from logs (`safeLogger`) and blocked from audit metadata. OAuth accounts keep `password_hash` null.

### Email verification, password reset, and change password

These flows protect **account authentication only**. They do **not** unlock, recover, rotate, or decrypt the private letters vault. User-facing copy states this on reset and change-password screens.

**Account authentication** is implemented by `@tgoliveira/secure-auth@0.1.19-internal` (thin app routes + `createSecureAuth` in `src/lib/secure-auth.ts`). See [`docs/AUTH_RESET_TO_SECURE_AUTH.md`](./docs/AUTH_RESET_TO_SECURE_AUTH.md).

**Email verification**

- Email/password registration creates users with `email_verified_at` null; OAuth sign-in marks email verified
- Verification tokens: cryptographically random opaque tokens; **hashed** (SHA-256) in `account_tokens`; single-use via atomic `consumeValidToken()`; 24-hour TTL
- Routes: `POST /api/auth/verify-email/resend`, `POST /api/auth/verify-email/confirm`; UI `/check-email`, `/verify-email?token=…`
- Resend is rate-limited; generic responses avoid account enumeration

**Forgot / reset password**

- `POST /api/auth/forgot-password` always returns the same generic message (no email-exists leak)
- Reset tokens: hashed in `account_tokens`; single-use; 1-hour TTL; consumed atomically in a transaction with password hash update
- `POST /api/auth/reset-password` (`action: validate` | `reset`); UI `/forgot-password`, `/reset-password?token=…`
- Password reset does **not** disable TOTP; next email/password login still requires 2FA when enabled
- Password reset does **not** touch vault keys, envelopes, or recovery codes

**Change password (signed in)**

- `POST /api/account/change-password` — requires current password; OAuth-only accounts rejected
- Password policy comes from `@tgoliveira/secure-auth` via `buildSecureAuthConfigFromEnv` (`AUTH_PASSWORD_MIN_LENGTH` / `PASSWORD_MIN_LENGTH`); default minimum length **12** when unset; all register, reset, and change-password flows share `secureAuth.uiConfig.passwordPolicy`

**Token and email security**

- Never store verification or reset tokens in plaintext
- Never log tokens or passwords; console adapter logs full URLs only when `EMAIL_PROVIDER=console` and `NODE_ENV !== "production"`
- SMTP adapter logs recipient domain and subject only — never email body or tokens
- Email abstraction: `sendEmail({ to, subject, html, text })` — providers: `console` (dev only), `smtp` (nodemailer); `resend`/`sendgrid` not implemented
- Account emails contain verification/reset links only — never private letter title/body or vault keys
- `EMAIL_PROVIDER=console` must not be used in production; use `smtp` with a real relay
- SMTP credentials via env vars only — never commit to the repository

**Session invalidation after password change**

- `users.password_updated_at` set on reset and change
- JWT callback compares session `iat` to `password_updated_at`; older sessions receive `sessionInvalidated` and are signed out on next request
- Password **change** keeps the current session (issued after update); other sessions invalidated via timestamp check
- Password **reset** invalidates all prior sessions (user must sign in again)

### Account sessions (sign-in state)

Account sessions are separate from vault unlock. Revoking a session signs out that browser from the account; it does not unlock or lock the vault.

- Each successful sign-in creates a server-side `account_sessions` row; JWT carries `sid` (session id)
- A session stays **active** while `revoked_at` is null **and** `expires_at` is in the future (`expires_at` aligns with `NEXTAUTH_SESSION_MAX_AGE`, default 30 days)
- Revocation is enforced in the NextAuth JWT callback — revoked sessions receive `sessionInvalidated`
- **Sign out** revokes the current `account_sessions` row (`POST /api/account/sessions/revoke-current` before clearing the cookie; NextAuth `signOut` event is a fallback)
- Metadata stored: auth method, coarse browser/platform/device type, hashed IP, masked IP for display
- Full IP is never shown in the UI; geolocation is not used
- `last_used_at` updates at most every `SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS` (default 300) during JWT refresh and when the account settings page pings sessions
- **Limitation:** `proxy.ts` decodes JWT without DB checks; revocation fully applies on the next `getServerSession`/JWT callback (same class of limitation as `password_updated_at`)

## Rate limiting

- Adapter interface with **in-memory** store for local/test (`RATE_LIMIT_STORE=memory`, default)
- **PostgreSQL** store for production multi-instance (`RATE_LIMIT_STORE=postgres`, table `rate_limit_buckets`)
- Scoped keys: operation + email + IP + endpoint with separate **email**, **IP**, and **email+IP** buckets for credentials login
- Credentials login IP captured via NextAuth route wrapper (`login-request-context.ts`)
- Applied to: registration, login, email verification resend/confirm, forgot/reset password, change password, session revoke actions, recovery unlock, passkey register/auth, account deletion
- **Social login:** OAuth token exchange and provider-side abuse controls are delegated to Google/Apple/Microsoft (NextAuth `azure-ad` provider); local rate limits apply to app auth routes where request context is available. Microsoft sign-in requests only `openid`, `email`, `profile` — no Microsoft Graph mail/calendar/files scopes; custom profile mapping avoids default Graph photo fetch. Document remaining distributed-abuse risk in threat model.
- **Microsoft sign-in:** account authentication only via `AUTH_AZURE_AD_*` env vars; provider ID `azure-ad`; callback `/api/auth/callback/azure-ad`; tenant default `common`. Does not unlock vault. No automatic cross-provider account linking (`oauth-sign-in-policy.ts`). Missing Microsoft email claim rejects sign-in safely.

## Account deletion

- UI: `/settings/account` — explains data removal, requires phrase `DELETE MY ACCOUNT`, password re-auth for credentials accounts
- `DELETE /api/account` with JSON body `{ confirmationPhrase, password? }` removes user and cascaded encrypted content
- OAuth-only accounts: session + confirmation phrase (see `TODO_SECURITY_REVIEW_REQUIRED` for provider re-auth before beta)
- After deletion: client calls `clearVaultClientState()`, signs out, redirects to `/account-deleted`
- Audit event `account_deletion_requested` without sensitive metadata

## Audit logging

Safe audit events only (no plaintext letters, recovery codes, keys, or ciphertext). Sanitized metadata allowlist in `audit-sanitization.ts`.

## Passkey account sign-in

- Passkeys can authenticate the account via discoverable WebAuthn (`challenge` type `login`, consumed atomically)
- Passkey sign-in does **not** require a separate TOTP code when account 2FA is enabled
- Email/password sign-in still requires TOTP when 2FA is enabled
- OAuth + TOTP behavior is unchanged (partial session until `/login/2fa`)
- Successful passkey login issues the same one-time `login-token` session as post-TOTP credentials login (`twoFactorVerified: true`)
- Vault unlock after passkey login happens **client-side only** when a valid PRF-based envelope exists for that credential and PRF output is available (`passkey-login-with-vault-unlock.ts` via react client alias)
- Discoverable passkey sign-in may prompt a **second WebAuthn step** with PRF (`POST /api/auth/passkey/login/vault-unlock/options`) before the session is completed
- If the passkey signs in but has no vault envelope (or PRF is unavailable), the vault remains locked and the user is routed to `/vault/unlock`
- Account passkey management: `GET /api/account/passkeys`, register/remove (package), optional vault unlock enable (`enable-vault-unlock`), status/revoke (`GET/DELETE .../vault-unlock`)

## Passkey vault unlock (PRF)

- Passkey **authentication** is separate from vault **decryption**
- Vault envelopes use WebAuthn **PRF** output as key-wrapping key (not raw signature bytes)
- PRF required for passkey envelopes; **no registration fallback** to device-secret wrapping
- If PRF is unavailable at registration, passkey vault envelope is **not** created and existing passkey envelopes are **not** revoked
- PRF diagnostics: `src/lib/passkey/passkey-prf-diagnostics.ts`; audit `docs/PASSKEY_VAULT_UNLOCK_DIAGNOSTIC_AUDIT.md`
- Primary UX: `/vault/settings` (not `/vault/recovery`) for enable/test/replace/disable; PRF-unsupported browsers see read-only status and cannot disable/replace without a PRF ceremony proof
- Vault unlock `returnTo` query param is sanitized (`sanitizeVaultReturnTo`) to internal paths only (`/notes`, `/vault/settings`, `/vault/security`, `/vault/recovery`, `/settings/account`); disabling passkey vault unlock requires DELETE/POST with verified WebAuthn assertion including PRF client extension results

### Vault security review (`/vault/security`)

- Read-only protection overview from `GET /api/vault/status` plus client PRF diagnostics; no decrypted note metadata
- **Recovery drill:** `verifyRecoveryPhraseDrill` unwraps the recovery envelope locally; phrase never sent to server; does not rotate/replace envelopes
- **Event log:** filtered `audit_events` via `vaultSecurityService`; client may record unlock/lock/drill events with `method` metadata only
- Export/import shown as not available yet
- WebAuthn challenges consumed atomically via `consumeValidChallenge()` (`DELETE … RETURNING` with expiry/user/type checks). **`findValidChallenge` is removed** — all flows must use atomic consumption.
- Indexes: `idx_webauthn_challenges_lookup`, `idx_webauthn_challenges_expires_at`

## WebAuthn challenges

Challenges scoped by user ID and type; expire after 5 minutes; deleted on use via atomic `consumeValidChallenge()`; expired rows cleaned on issue. Challenge reuse is impossible — concurrent consumption attempts cannot both succeed.

## Vault session hardening

- **Inactivity auto-lock** (default 15 minutes; `NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES` / `VAULT_AUTO_LOCK_MINUTES`) — remaining time shown in collapsed dock handle (`mm:ss`) and expanded open dock (`Vault open · Auto-locks in mm:ss`). Single timer in `vault-session.ts`; `registerVaultBeforeAutoLock` saves encrypted note drafts before lock.
- **Activity detection:** window events plus document capture (`keydown`, `input`, `pointerdown`, `compositionstart`, `compositionend`, `paste`); note editor calls `touchVaultActivity()` on change.
- **Vault status UI:** global `VaultStatusDock` inside authenticated header when signed in (no note title/body/category/tag or vault secrets in the dock); collapsed handle shows `Closed` when locked or countdown when open
- **Inline unlock:** expanded locked dock embeds `VaultDockQuickUnlock` — vault password and passkey PRF (when envelope exists and browser is not PRF-unsupported). Recovery phrase unlock is only on `/vault/unlock`. Same client-only unlock services as the full page; secrets never sent to the server. Dock shows status-only message on `/vault/unlock` (no duplicate form).
- Dock auto-collapses on `/vault/unlock` and when **Open full unlock page** is clicked; no duplicate unlock form on that route
- Locked vault surfaces (`VaultLockedState`) use context-specific copy and **Unlock here** (expands dock) plus **Open full unlock page** — no recovery protection summary or “recovery code” in active copy
- Manual **Lock now** (expanded open dock) clears in-memory key, note body cache, and sets a session lock flag; note pages hide decrypted content until explicit unlock
- In-memory User Vault Key cleared on lock, sign out, and `pagehide` (best effort)

See [`docs/VAULT_AUTO_LOCK_NORMALIZATION.md`](docs/VAULT_AUTO_LOCK_NORMALIZATION.md).

## Import / export (MVP)

**Not available.** Bulk import and export of decrypted notes are deferred per TDR §21. Documented on `/vault/settings`, public home page, and README. No server endpoint exposes decrypted content.

## Autosave (MVP decision)

**Disabled.** Plaintext autosave is forbidden. Notes are saved only via explicit encrypted submit.
