# Passkey Login and Vault Unlock

Last updated: 2026-06-17

## Core rule

```text
A passkey may authenticate the account.

The same passkey may unlock the vault only when it has a valid vault envelope
created with a reviewed PRF-based mechanism.

Otherwise, the user is signed in, but the vault remains locked.
```

Account authentication and vault decryption are **separate** operations.

## Integration point

| Layer | Location | Role |
|-------|----------|------|
| Login UI | `@tgoliveira/secure-auth/react` `LoginPage` → `LoginPasskeySection` | Calls `signInWithPasskey` from `@tgoliveira/secure-auth/react/client` |
| App shim | `src/lib/secure-auth/vault-passkey-react-client.ts` (Next/Vitest alias) | Re-exports package client helpers but replaces `signInWithPasskey` |
| Vault-aware flow | `src/features/passkey/passkey-login-with-vault-unlock.ts` | WebAuthn account auth, optional PRF vault unlock, then `login-token` session |
| Verify | `POST /api/auth/passkey/login/verify` | Pure package delegate — `loginToken`, `userId`, `credentialId`, `requiresTwoFactor` only |
| Vault metadata | `POST /api/auth/passkey/login/vault-unlock/metadata` | Product route gated by package `loginToken` |
| Options enrichment | `POST /api/auth/passkey/login/options` | Delegates to secure-auth, injects PRF extensions when credential can vault-unlock |
| Follow-up PRF step | `POST /api/auth/passkey/login/vault-unlock/options` | Second WebAuthn ceremony when first login options could not include PRF |
| Enable vault on account passkey | `POST /api/account/passkeys/[id]/enable-vault-unlock` | Creates PRF envelope while vault is unlocked |
| Status / revoke | `GET` / `DELETE` `/api/account/passkeys/[id]/vault-unlock` | Per-passkey vault unlock status and revocation |
| Outcome UX | `/notes`, `/vault/unlock` | Read `{appSlug}-passkey-login-outcome` from `sessionStorage` |

## Detecting passkey login

Only `signInWithPasskey` (via vault shim) attempts automatic vault unlock. Password, OAuth, and TOTP flows do not call it.

## Vault-compatible passkey

After account WebAuthn verify:

1. `credentialId` from verify response
2. `POST /api/auth/passkey/login/vault-unlock/metadata` with `loginToken` + `credentialId`
3. Passkey row: `signInEnabled` and `vaultUnlockEnabled`
4. Active PRF-based passkey vault envelope for that credential
5. PRF output from the WebAuthn assertion (or follow-up ceremony)

Unlock reuses `unlockVaultFromPasskeyEnvelope` from `src/lib/crypto-client/passkey-vault.ts`.

## Outcomes

| Case | Vault | Redirect | User message |
|------|-------|----------|--------------|
| A — valid envelope + PRF | Unlocked | `afterLoginPath` (default `/notes`) | Signed in with passkey. Your private notes are unlocked on this device. |
| B — no envelope | Locked | `/vault/unlock` | You are signed in, but your vault is still locked because this passkey is not set up to unlock it. |
| C — PRF unavailable | Locked | `/vault/unlock` | This passkey signed you in, but this browser or passkey provider cannot unlock your vault with it yet. |
| D — password/OAuth | Locked (no auto-unlock) | Existing auth redirect | N/A |

Login is never rolled back when vault unlock fails.

## Security logging

Client-side `safeLogger` events (no secrets):

- `passkey_login_completed`
- `passkey_login_vault_auto_unlock_succeeded`
- `passkey_login_vault_auto_unlock_unavailable`
- `passkey_vault_unlock_succeeded` / `passkey_vault_unlock_failed`
- `passkey_vault_unlock_enabled` / `passkey_vault_unlock_disabled` (server audit)

## Tests

- `src/test/features/passkey-login-with-vault-unlock.test.ts` — client flow cases A–C
- `src/test/api/passkey-login-vault-routes.test.ts` — options enrichment
- `src/test/api/passkey-vault-unlock-metadata-route.test.ts` — metadata route
- `src/test/security/passkey-login-vault-unlock.test.ts` — boundaries
- `src/test/features/secure-auth-vault-passkey-client-shim.test.ts` — shim wiring

See `docs/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md`.
