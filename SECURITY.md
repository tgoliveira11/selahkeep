# Security — Private Letters Vault MVP

## Privacy Promise

> Your private letters are protected on your device before they are saved. Our systems are designed so our team does not have access to the keys required to read them.

## Non-Negotiable Rules

1. Private letter title and body encrypted in browser before API requests.
2. Backend receives only structured encrypted payloads.
3. User Vault Key generated on client; never sent in plaintext.
4. Letter Key generated per letter; encrypted by User Vault Key.
5. Recovery codes never stored in plaintext (≥128 bits entropy).
6. No plaintext keys or letter content in localStorage, sessionStorage, cookies, URLs, logs, or analytics.
7. No AI processing of private letters.
8. No admin access to private letter content.
9. No Server Actions for private letter persistence.
10. Frontend must not access database directly.

## Cryptography (ADR-001)

- AES-GCM, 256-bit keys, 96-bit random IV per operation
- Structured payload: `version`, `alg`, `iv`, `ciphertext`, `aad`
- **AAD binding (server + client):** `aad.userId` must match session user; `aad.resourceId` must match persisted letter/vault id; `aad.field` must match the encrypted field. Reject mismatches before storage.
- **Letter IDs:** client generates UUID; server persists the same id (no server reassignment).
- Recovery KDF: Argon2id preferred; PBKDF2-SHA-256 fallback (600k iterations) with versioned `kdf-v1` metadata
- Recovery codes: ≥128 bits entropy (project-specific wordlist, not BIP39; currently 17 words from 252 unique words ≈ 135.6 bits); uniform word selection + rejection sampling; shown only at generation/regeneration; never stored plaintext

## Vault Unlocking (ADR-002)

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

Allowed in IndexedDB (per ADR-002):

- **Encrypted vault envelope** (`encryptedVaultKey` structured payload only)
- **Non-extractable device secret** (`CryptoKey` with `extractable: false` — never raw key bytes as strings)

Forbidden in browser persistence:

- Plaintext User Vault Key, Letter Key, recovery code, or letter title/body
- Exportable/raw device secret strings (legacy v1 storage was migrated away on DB upgrade)

### Threat model (local storage)

| Threat | Mitigation |
|--------|------------|
| **XSS on this origin** | Strict CSP (`script-src 'self'` in production), no inline scripts; XSS can still invoke Web Crypto while the page is open — treat XSS as vault compromise |
| **IndexedDB export / DevTools copy** | Device secret stored as non-extractable `CryptoKey`, not copy-paste base64; vault key remains AES-GCM ciphertext |
| **Stolen session cookie only** | Server stores ciphertext only; unlock still requires client key material |
| **Sign out on shared device** | `clearVaultClientState()` wipes IndexedDB envelopes and in-memory vault key |
| **Revoked trusted device** | Server envelope revoked; online unlock checks device status and clears local IndexedDB; revoking current device calls `clearVaultClientState()` |

Trusted device records store display metadata only (`deviceName`, browser, platform, form factor, `devicePublicKey.deviceId`). They must not store exportable key bytes. Re-registering the same active client `deviceId` returns the existing server row idempotently (no duplicate active rows). The server never mutates an existing active row's `clientDeviceId` based on metadata alone.

Residual risk: a malicious script running on this origin (XSS) or compromised browser profile on an unlocked session can still decrypt letters. That is inherent to client-side encryption; depth-in-defense is CSP + minimal persistence + non-extractable keys.

## Observability

Never log: plaintext title/body, User Vault Key, Letter Key, recovery code, decrypted payloads.

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
- OAuth login: partial session until `POST /api/auth/login/verify-2fa-oauth` + session upgrade token; middleware blocks app routes until verified
- Rate limits: setup verify, login verify, disable, backup regeneration
- Audit events never include TOTP secrets, codes, or backup codes

## Authentication passwords

Credentials passwords are **never stored in plaintext** and are **not reversibly encrypted**. The server stores a **bcrypt one-way hash** in `users.password_hash` (cost factor **12** via `src/server/policies/password-hashing.ts`).

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

## Rate limiting

- Adapter interface with **in-memory** store for local/test (`RATE_LIMIT_STORE=memory`, default)
- **PostgreSQL** store for production multi-instance (`RATE_LIMIT_STORE=postgres`, table `rate_limit_buckets`)
- Scoped keys: operation + email + IP + endpoint with separate **email**, **IP**, and **email+IP** buckets for credentials login
- Credentials login IP captured via NextAuth route wrapper (`login-request-context.ts`)
- Applied to: registration, login, recovery unlock, passkey register/auth, trusted-device create, account deletion
- **Social login:** OAuth token exchange and provider-side abuse controls are delegated to Google/Apple; local rate limits apply to app auth routes where request context is available. Document remaining distributed-abuse risk in threat model.

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
- Vault unlock after passkey login happens **client-side only** when a valid PRF-based envelope exists for that credential and PRF output is available
- Discoverable passkey sign-in may prompt a **second WebAuthn step** with PRF (`POST /api/auth/passkey/login/vault-unlock/options`) before the session is completed
- If the passkey signs in but has no vault envelope (or PRF is unavailable), the vault remains locked and the user is routed to the vault unlock flow
- Account passkey management: `GET /api/account/passkeys`, register/remove, and optional upgrade to vault unlock while vault is unlocked

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

- **15-minute inactivity** auto-lock (`vault-session.ts`) — same as manual lock; blocks silent re-unlock until explicit unlock via gate or unlock screen
- Manual **Lock vault** clears in-memory key and sets a session lock flag; letter pages hide decrypted content and require unlock again
- In-memory User Vault Key cleared on lock, sign out, and `pagehide` (best effort)

## Autosave (MVP decision)

**Disabled.** Plaintext autosave is forbidden. Letters are saved only via explicit encrypted submit.
