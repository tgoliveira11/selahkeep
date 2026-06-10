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
- Recovery codes: ≥128 bits entropy (uniform word selection + rejection sampling); shown only at generation/regeneration; never stored plaintext

## Vault Unlocking (ADR-002)

- Passkeys must not be used as raw encryption keys
- Trusted devices are revocable
- Revoked devices cannot unlock vault when online (server checks `GET /api/trusted-devices/status`; local IndexedDB cleared on revoke)
- Every trusted-device envelope links to `publicMetadata.trustedDeviceId`
- **Offline limitation:** if the client cannot reach the server, a previously cached local envelope might still decrypt until the next online revocation check. Documented residual risk.

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

Trusted device records store display metadata only (`deviceName`, browser, platform, form factor, `devicePublicKey.deviceId`). They must not store exportable key bytes. Duplicate registration of the same client `deviceId` is rejected server-side.

Residual risk: a malicious script running on this origin (XSS) or compromised browser profile on an unlocked session can still decrypt letters. That is inherent to client-side encryption; depth-in-defense is CSP + minimal persistence + non-extractable keys.

## Observability

Never log: plaintext title/body, User Vault Key, Letter Key, recovery code, decrypted payloads.

Error tracking must strip request/response bodies and sensitive headers.

## Threat Model

Formal threat model required before public beta. See TDR §26.
