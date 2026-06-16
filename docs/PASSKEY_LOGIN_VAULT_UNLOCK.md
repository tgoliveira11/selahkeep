# Passkey Login and Vault Unlock

Last updated: 2026-06-16

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
| App shim | `src/lib/secure-auth/react-client.ts` (Next/Vitest alias) | Re-exports package client helpers but replaces `signInWithPasskey` with the product implementation |
| Vault-aware flow | `src/features/passkey/sign-in-with-passkey.ts` | WebAuthn account auth, optional PRF vault unlock, then `login-token` session |
| Verify enrichment | `POST /api/auth/passkey/login/verify` | Delegates to secure-auth, then adds `vaultUnlockAvailable`, `encryptedVaultKey`, `prfRequired` |
| Options enrichment | `POST /api/auth/passkey/login/options` | Delegates to secure-auth, injects PRF extensions when a known credential can vault-unlock, then adds `prfIncluded` |
| Follow-up PRF step | `POST /api/auth/passkey/login/vault-unlock/options` | Second WebAuthn ceremony only when the first login options could not include PRF (fully discoverable sign-in with no email/hint) |
| Outcome UX | `/letters`, `/vault/unlock` | Read `letters-to-god-passkey-login-outcome` from `sessionStorage` |

## Detecting passkey login

Only the passkey feature module (`signInWithPasskey`) attempts automatic vault unlock. Password, OAuth, and TOTP flows do not call it.

The login method is implicit: vault auto-unlock runs only inside `signInWithPasskey`, which is wired through the react client shim used by `LoginPasskeySection`.

## Vault-compatible passkey

After account WebAuthn verify, the app checks:

1. `credentialId` from verify response
2. Passkey row: `signInEnabled` and `vaultUnlockEnabled`
3. Active PRF-based passkey vault envelope for that credential
4. PRF output from the WebAuthn assertion (or follow-up ceremony)

Unlock reuses `unlockVaultFromPasskeyEnvelope` from `src/lib/crypto-client/passkey-vault.ts`.

## Outcomes

| Case | Vault | Redirect | User message |
|------|-------|----------|--------------|
| A — valid envelope + PRF | Unlocked | `afterLoginPath` (default `/letters`) | Signed in with passkey. Your private letters are unlocked on this device. |
| B — no envelope | Locked | `/vault/unlock` | You are signed in. Your private letters are still locked because this passkey is not set up to unlock them. |
| C — PRF unavailable | Locked | `/vault/unlock` | This passkey signed you in, but this browser or passkey provider cannot unlock your private letters with it. |
| D — password/OAuth | Locked (no auto-unlock) | Existing auth redirect | N/A |

Login is never rolled back when vault unlock fails.

## Security logging

Client-side `safeLogger` events (no secrets):

- `passkey_login_completed`
- `passkey_login_vault_unlock_succeeded`
- `passkey_login_vault_unlock_unavailable`
- `passkey_login_vault_unlock_failed`

## `@tgoliveira/secure-auth` limitations

The package exposes:

- `signInWithPasskey(input, { appSlug, loginPath, afterLoginPath })` via `@tgoliveira/secure-auth/react/client`
- Passkey verify result: `loginToken`, `userId`, `credentialId` only (no vault fields, no PRF)

The package does **not** expose vault unlock or PRF in its passkey login API. The app extends behavior without forking package internals:

1. Next/Vitest alias replaces `react/client` with `src/lib/secure-auth/react-client.ts`
2. App API route wrappers enrich options/verify responses
3. Product `signInWithPasskey` performs vault unlock before `signIn("login-token")`

A minimal upstream extension (optional): allow an `onPasskeyLoginVerified` hook or return vault metadata from verify when the host app registers envelope lookup — not required for this integration.

## Tests

- `src/test/features/sign-in-with-passkey.test.ts` — client flow cases A–C
- `src/test/api/passkey-login-routes.test.ts` — API enrichment
- `src/test/services/passkey-login-service.test.ts` — envelope metadata lookup
- `src/test/security/passkey-login-vault-unlock.test.ts` — boundaries (unlock before session, no OAuth/password unlock)
- `src/test/features/secure-auth-react-client-shim.test.tsx` — shim wiring
