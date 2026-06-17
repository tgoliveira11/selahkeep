# ADR-006 — SelahKeep Passkey PRF Unlock

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-06-17 |
| **Related** | ADR-002, ADR-005, `docs/TDR_LTG_Vault_MVP.md`, Phase 4 |

---

## 1. Passkey account authentication vs passkey vault unlock

| Operation | Owner | Purpose |
|-----------|-------|---------|
| Account passkey sign-in | `@tgoliveira/secure-auth` | Establishes account session only |
| Passkey vault unlock | SelahKeep product layer | Unwraps User Vault Key via PRF-based envelope |

The same physical passkey credential may perform both only when the user has explicitly enabled vault unlock and a valid `passkey_prf` envelope exists.

## 2. Why account login alone cannot unlock the vault

Account sessions prove identity to the server. They do not carry the User Vault Key or PRF output. Vault decryption remains client-side and requires a separate unlock method (vault password, recovery phrase, or passkey PRF envelope).

## 3. PRF-based envelope format

Envelope type: `passkey_authorized_device` (legacy method name) with `publicMetadata`:

```json
{
  "credentialId": "<webauthn-credential-id>",
  "prfRequired": true
}
```

`encryptedVaultKey` is AES-GCM over exported UVK bytes, keyed by PRF-derived AES-256 key. AAD includes `userId` and `resourceId` per ADR-001.

## 4. How PRF output is obtained client-side

During WebAuthn authentication or registration, the client requests the `prf` extension (`src/lib/passkey/prf.ts`). `extractPasskeyPrfOutput()` reads `clientExtensionResults.prf.results.first` (≥32 bytes). PRF is evaluated by the authenticator; the server never receives PRF bytes.

## 5. How PRF output wraps/unwraps the User Vault Key

1. Import first 32 PRF bytes as AES-256-GCM key (`importPrfAsAesKey`).
2. Encrypt exported UVK with that key → `encryptedVaultKey`.
3. On unlock, decrypt `encryptedVaultKey` with the same PRF output → import UVK → `unlockVaultSession`.

Implementation: `src/lib/crypto-client/passkey-vault.ts`.

## 6. Credential / envelope matching

After account passkey verify, the product looks up:

1. `credentialId` from verify response
2. `passkey_credentials` row: `signInEnabled` + `vaultUnlockEnabled`
3. Active envelope where `publicMetadata.credentialId` matches

Lookup for pre-session flows uses package-issued `loginToken` via `login-token-repository` (read-only).

## 7. Server-side storage

| Store | Fields |
|-------|--------|
| `passkey_credentials` | `vault_unlock_enabled`, `prf_supported`, `credential_id` |
| `vault_unlock_envelopes` | `method`, `encrypted_vault_key`, `public_metadata`, `revoked_at` |

## 8. Must never be stored or sent server-side

PRF output, User Vault Key, note keys, vault password, recovery phrase, plaintext note fields, WebAuthn signatures used as encryption keys.

API routes reject `prfOutput`, `userVaultKey`, `noteKey`, `vaultPassword`, `recoveryPhrase`, and generic plaintext note fields.

## 9. PRF unavailable

No `passkey_prf` envelope is created. UI shows calm fallback copy. Post-login: user is signed in; vault stays locked.

## 10. Passkey without vault envelope

Account sign-in succeeds. Vault remains locked. User is directed to `/vault/unlock` with messaging that the passkey is not set up for vault unlock.

## 11. Post-login auto-unlock

Vault-only shim `src/features/passkey/passkey-login-with-vault-unlock.ts` wraps package flow:

1. `POST /api/auth/passkey/login/options` (PRF enrichment)
2. WebAuthn assertion
3. `POST /api/auth/passkey/login/verify` (package delegate — no vault fields)
4. `POST /api/auth/passkey/login/vault-unlock/metadata` (product, loginToken-gated)
5. Optional second ceremony via `vault-unlock/options` when PRF was not in first options
6. Client unwrap if PRF + envelope
7. `signIn("login-token")` — login never rolled back on vault failure

Wired via Next/Vitest alias: `@tgoliveira/secure-auth/react/client` → `vault-passkey-react-client.ts`.

## 12. Fallback UX

| Case | Message theme |
|------|----------------|
| No envelope | Signed in; passkey not set up to unlock vault |
| PRF unavailable | Signed in; browser cannot unlock vault with passkey |
| Decrypt failure | Use vault password or recovery phrase |

Copy in `src/lib/passkey/messages.ts`. Outcomes stored in `sessionStorage` under `{appSlug}-passkey-login-outcome`.

## 13. Browser / provider limitations

`detectPasskeyPrfSupport()` and `prf-support.ts` gate envelope creation. Safari and some providers may lack PRF — fail closed, no fake envelopes.

## 14. Tests proving auth / vault separation

- `passkey-login-vault-unlock.test.ts` — verify route stays package-only; vault metadata on separate route
- `passkey-login-with-vault-unlock.test.ts` — cases A–D client flow
- `passkey-login-boundary.test.ts` — sign-in vs vault capability labels
- Security: PRF/UVK never in API payloads (`passkey-vault-plaintext-rejection.test.ts`)

---

## Security review

Passkey PRF vault unlock implementation requires human security review before production (`SECURITY.md`).
