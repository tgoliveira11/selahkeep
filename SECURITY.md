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
- Recovery KDF: Argon2id preferred; PBKDF2-SHA-256 fallback with versioned metadata

## Vault Unlocking (ADR-002)

- Passkeys must not be used as raw encryption keys
- Trusted devices are revocable
- Revoked devices cannot unlock vault

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
| **Revoked trusted device** | Server envelope revoked; local material alone cannot re-register device without unlock flow |

Residual risk: a malicious script running on this origin (XSS) or compromised browser profile on an unlocked session can still decrypt letters. That is inherent to client-side encryption; depth-in-defense is CSP + minimal persistence + non-extractable keys.

## Observability

Never log: plaintext title/body, User Vault Key, Letter Key, recovery code, decrypted payloads.

Error tracking must strip request/response bodies and sensitive headers.

## Threat Model

Formal threat model required before public beta. See TDR §26.
