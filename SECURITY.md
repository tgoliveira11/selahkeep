# Security — LTG Vault MVP

> **Source of truth:** [`docs/TDR_LTG_Vault_MVP.md`](./docs/TDR_LTG_Vault_MVP.md), [`docs/ADR-005_*`](./docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md), [`docs/ADR-006_*`](./docs/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md). Phases 0–5 complete.

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
- **LTG vault password KDF (new setups):** Argon2id only via `hash-wasm` — no PBKDF2 fallback (`src/lib/crypto-client/vault-kdf.ts`, ADR-005)
- **LTG recovery phrase (new setups):** BIP39 English, 12 or 24 words (`src/lib/crypto-client/recovery-phrase.ts`)
- **Legacy recovery code KDF:** Argon2id preferred; PBKDF2-SHA-256 fallback (600k iterations) with versioned `kdf-v1` metadata — legacy `recovery_code` envelopes only
- Recovery codes: ≥128 bits entropy (project-specific wordlist, not BIP39; currently 17 words from 252 unique words ≈ 135.6 bits); uniform word selection + rejection sampling; shown only at generation/regeneration; never stored plaintext

## Vault Unlocking (ADR-005 / ADR-006)

- Passkeys must not be used as raw encryption keys
- Trusted devices are revocable
- Revoked devices cannot unlock vault when online (server checks `GET /api/trusted-devices/status`; local IndexedDB cleared on revoke)
- **Fail closed:** `assertTrustedDeviceCanUnlock()` blocks unlock on HTTP 401/403/404/5xx and on `not_registered`; only real network/offline failures allow local-only unlock
- Typed client errors: `RevokedTrustedDeviceError`, `UnauthenticatedTrustedDeviceError`, `ForbiddenTrustedDeviceError`, `UnknownTrustedDeviceError`, `TrustedDeviceServerError`, `TrustedDeviceUnexpectedError`
- Every trusted-device envelope links to `publicMetadata.trustedDeviceId`
- Active trusted devices enforce unique `(user_id, client_device_id)` via `client_device_id` column + partial unique index
- **Trusted device identity:** a trusted device means a trusted **browser storage profile**, not a physical computer. Normal and incognito/private windows are different storage profiles and are treated as different trusted devices when they have different `clientDeviceId` values. The app does **not** silently relink trusted devices based on browser/platform/deviceType metadata.
- **Display metadata only:** coarse fields such as browser, platform, and device type are display information only. They must not be used as proof that two profiles are the same trusted device.
- **Registration:** `POST /api/trusted-devices` is idempotent for the same active `userId + clientDeviceId` (returns existing row). A different `clientDeviceId` always creates a separate trusted device, even when metadata matches.
- **Offline limitation:** if the client cannot reach the server (detected network failure only), a previously cached local envelope may still decrypt until the next successful online status check. HTTP auth/server errors do **not** fall back to offline unlock. When offline unlock is allowed, the UI shows: *"Unlocked using this device while offline. Device status will be verified again when you reconnect."*
- When the app is offline and the current device has valid local vault material, local unlock may be allowed. The device revocation status will be verified again when the app reconnects. This is an offline usability trade-off and does not override online revocation checks.

## Database transactions

Multi-step sensitive flows use `runInTransaction()` (vault init, trusted device create/revoke, recovery code store, passkey register/remove). Failures roll back related writes.

## Browser Storage (IndexedDB)

Allowed in IndexedDB (legacy trusted-device path):

- **Encrypted vault envelope** (`encryptedVaultKey` structured payload only)
- **Non-extractable device secret** (`CryptoKey` with `extractable: false` — never raw key bytes as strings)

Forbidden in browser persistence:

- Plaintext User Vault Key, Letter Key, Note Key, recovery code, or note/letter title/body
- Exportable/raw device secret strings (legacy v1 storage was migrated away on DB upgrade)

### Threat model (local storage)

| Threat | Mitigation |
|--------|------------|
| **XSS on this origin** | Nonce-based CSP in `src/proxy.ts` (`script-src 'self' 'nonce-…' 'strict-dynamic' 'wasm-unsafe-eval'`); `wasm-unsafe-eval` is required for client-side Argon2 (`hash-wasm`) on recovery flows |
| **IndexedDB export / DevTools copy** | Device secret stored as non-extractable `CryptoKey`, not copy-paste base64; vault key remains AES-GCM ciphertext |
| **Stolen session cookie only** | Server stores ciphertext only; unlock still requires client key material |
| **Sign out on shared device** | `clearVaultClientState()` wipes IndexedDB envelopes and in-memory vault key |
| **Revoked trusted device** | Server envelope revoked; online unlock checks device status and clears local IndexedDB; revoking current device calls `clearVaultClientState()` |

Trusted device records store display metadata only (`deviceName`, browser, platform, form factor, `devicePublicKey.deviceId`). They must not store exportable key bytes. Re-registering the same active client `deviceId` returns the existing server row idempotently (no duplicate active rows). The server never mutates an existing active row's `clientDeviceId` based on metadata alone.

Residual risk: a malicious script running on this origin (XSS) or compromised browser profile on an unlocked session can still decrypt notes and letters. That is inherent to client-side encryption; depth-in-defense is CSP + minimal persistence + non-extractable keys + Markdown sanitization on preview.

## Notes (Phase 2–3)

- Note title lives in **encrypted metadata** (`note_metadata` AAD); body is Markdown encrypted under Note Key (`note_body` AAD).
- Note Key is wrapped by User Vault Key (`note_key` AAD) — never sent to API in plaintext.
- Vault index (list titles, categories, tags, answered flags) is client-encrypted under UVK; server stores ciphertext only.
- Category and tag **names** live only in the encrypted vault index (v2); never in database columns or API plaintext fields.
- Answered status is stored only in encrypted note metadata and vault index — not in database columns.
- **Search and filters** run client-side in memory after vault unlock; there is no server search endpoint and queries never leave the browser.
- Vault setting `unlockBehavior`: `metadata_only` (default) or `decrypt_all` (eager body decrypt after unlock) — stored in encrypted vault settings.
- Markdown preview uses `dompurify` allowlist before `dangerouslySetInnerHTML`.
- Note APIs reject plaintext `title`, `body`, `markdown`, `tags`, `categoryId`, `categoryName`, `tagNames`, `answered`, `noteKey`, etc.
- Soft delete (`deleted_at` on notes + `deletedAt` in vault index); no plaintext search indexes.

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
- OAuth login (Google, Apple, Microsoft): partial session until `POST /api/auth/login/verify-2fa-oauth` + session upgrade token; `src/proxy.ts` blocks app routes until verified
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

**Account authentication** is implemented by `@tgoliveira/secure-auth@0.1.17-internal` (thin app routes + `createSecureAuth` in `src/lib/secure-auth.ts`). See [`docs/AUTH_RESET_TO_SECURE_AUTH.md`](./docs/AUTH_RESET_TO_SECURE_AUTH.md).

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

Account sessions are **not** trusted devices. Revoking a session signs out that browser from the account; it does not revoke vault unlock trust or delete trusted-device envelopes.

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
- Applied to: registration, login, email verification resend/confirm, forgot/reset password, change password, session revoke actions, recovery unlock, passkey register/auth, trusted-device create, account deletion
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
- Passkey-based vault unlock requires PRF support. If PRF is unavailable, the app must not create a passkey vault envelope and must not present that passkey as a recovery method.
- WebAuthn challenges consumed atomically via `consumeValidChallenge()` (`DELETE … RETURNING` with expiry/user/type checks). **`findValidChallenge` is removed** — all flows must use atomic consumption.
- Indexes: `idx_webauthn_challenges_lookup`, `idx_webauthn_challenges_expires_at`

## WebAuthn challenges

Challenges scoped by user ID and type; expire after 5 minutes; deleted on use via atomic `consumeValidChallenge()`; expired rows cleaned on issue. Challenge reuse is impossible — concurrent consumption attempts cannot both succeed.

## Vault session hardening

- **15-minute inactivity** auto-lock (`VAULT_INACTIVITY_MS` in `vault-session.ts`) — resets on pointer, keyboard, touch, and scroll activity via `use-vault-activity.ts`
- Auto-lock shows: *“Your vault was locked to protect your private notes.”* (`vault-auto-lock-notice.tsx`)
- Manual **Lock vault** clears in-memory key, note body cache, and sets a session lock flag; note pages hide decrypted content until explicit unlock
- In-memory User Vault Key cleared on lock, sign out, and `pagehide` (best effort)

## Import / export (MVP)

**Not available.** Bulk import and export of decrypted notes are deferred per TDR §21. Documented on `/vault/settings`, public home page, and README. No server endpoint exposes decrypted content.

## Autosave (MVP decision)

**Disabled.** Plaintext autosave is forbidden. Notes are saved only via explicit encrypted submit.
