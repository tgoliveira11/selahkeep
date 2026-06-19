# SelahKeep Vault Module

Product-owned vault layer. Account authentication (`@tgoliveira/secure-auth`) and vault unlock are **separate**.

## Structure

- `@tgoliveira/vault-core` — reusable crypto, envelopes, recovery phrase, session memory
- `@tgoliveira/vault-core/react` — headless session hooks (`useVaultUnlocked`, `resolveVaultClientStatus`)
- `selahkeep-profile.ts` — frozen SelahKeep AAD/PRF compatibility constants
- `core/` — profile-bound envelope wrappers
- `client/` — browser session extensions (auto-lock draft flush, note cache clear), passkey PRF salt
- `services/` — encrypted persistence (server)
- `components/` — vault UI fragments

## Boundaries

- Vault crypto does **not** live in secure-auth
- Server never receives vault password, recovery phrase, UVK, PRF output, or decrypted note content
- Decrypted vault state stays in memory only (no localStorage/IndexedDB for keys or note plaintext)

## Dependency

```json
"@tgoliveira/vault-core": "^0.1.1"
```

Note encryption (title/body/metadata) remains in `src/lib/crypto-client/` — product-specific AAD fields beyond vault-core `VaultAadField`.

## UX

- Inline vault setup and unlock on `/notes` via **Vault Status Dock** (primary)
- Full-page `/vault/*` routes remain for setup, unlock, recovery, settings, and security review

## Legacy compatibility

- PRF salt prefix: `letters-passkey-prf-v1:` (unchanged)
- Pre-vault-core envelopes omit AAD `context`; vault-core decrypt tries legacy byte order variants
