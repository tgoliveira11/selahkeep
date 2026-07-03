> **⚠️ ARCHIVED — obsolete (2026-07-03).** Superseded by `@tgoliveira/vault-core` as the single source of truth for vault and passkey PRF unlock behavior. See the package's `README.md`, `docs/IMPLEMENTATION_GUIDE.md`, and `PASSKEY_PRF_ENVELOPES.md`. Kept for historical context only — do not use for current implementation guidance.

---

# SelahKeep — Touch ID vs QR passkey prompt fix

**Date:** 2026-06-19  
**Product:** SelahKeep  
**Status:** Implemented

---

## Problem

After configuring both an account passkey and a separate vault passkey, vault unlock on macOS sometimes showed a **QR-code / phone-or-tablet** WebAuthn prompt instead of **Touch ID**, while account passkey sign-in still used Touch ID.

Deleting a vault passkey and re-registering could fail with **"identifier already used"** because disabled vault-only credentials remained in `excludeCredentials`.

## Root causes (SelahKeep integration)

1. **Dual-passkey credential selection** — vault unlock previously included account-only credentials in `allowCredentials`. Fixed with `purpose: "vault_unlock"` filtering to `vaultUnlockEnabled` credentials only.
2. **Transport stripping** — client filtering narrowed options to `{ id, type }` without `transports`. Fixed by preserving the matching server credential entry.
3. **Missing transport hints** — registration did not always persist transports. Fixed by persisting browser-reported transports and replaying them in `allowCredentials`.
4. **Cross-platform registration default** — vault passkey registration did not prefer platform authenticators. Fixed: vault-only registration now sets `authenticatorAttachment: "platform"`.
5. **Stale credential on disable** — vault-only disable left revoked-capable rows with `vaultUnlockEnabled: false` still active and still excluded from re-registration. Fixed: vault-only disable revokes the credential row; `excludeCredentials` for vault registration excludes only **active** vault-enabled credentials.
6. **Apple user-handle collision** — Apple documents that registering another passkey with the same RP ID and user ID overwrites the existing passkey on the user’s devices. Vault-only registration now uses a deterministic, opaque vault-specific WebAuthn user handle so a later account passkey cannot replace it.

## What did not change

- `@tgoliveira/vault-core` — unchanged
- `@tgoliveira/secure-auth` — unchanged (account passkey sign-in behavior unchanged)
- PRF remains required for vault unlock; no non-PRF fallback
- No WebAuthn signatures used as encryption keys

## Current behavior

### Vault passkey registration (vault-only)

- `POST /api/passkeys/register` with `{ action: "options", vaultOnly: true }` and verify with `prfVaultEnvelope: true`
- `authenticatorSelection.authenticatorAttachment: "platform"` — Touch ID / Windows Hello preferred
- `excludeCredentials`: only active `vaultUnlockEnabled` credentials (not account-only, not revoked/disabled vault credentials)

### Vault unlock

- `POST /api/passkeys/authenticate` with `{ action: "options" | "verify", purpose: "vault_unlock" }`
- Server `allowCredentials`: only `vaultUnlockEnabled === true` credentials, preserving reported transports
- Client helper: `src/lib/passkey/vault-unlock-authenticate.ts`
- PRF extension: `eval` or `evalByCredential`
- Fail closed without PRF at client unwrap

### Account passkey sign-in

- `@tgoliveira/secure-auth` login routes — `signInEnabled` credentials only, no PRF

## Transport policy

- Persist exactly what the browser returns at registration
- Store `null` when transports are absent — **do not** default to `["internal"]` without evidence
- When filtering to one credential ID, preserve the full matching `allowCredentials` entry including `transports`
- Vault-only and account passkeys use different opaque WebAuthn user handles under the same SelahKeep account

## Development diagnostics

In development only, vault unlock logs safe option metadata (no credential IDs):

```json
{
  "purpose": "vault_unlock",
  "allowCredentialsCount": 1,
  "transportHints": ["internal"],
  "prfMode": "eval",
  "authenticatorAttachmentAtRegistration": "platform",
  "userVerification": "required"
}
```

## Platform authenticator conflict

If a passkey still exists in the device password manager:

> This passkey already exists on this device. Remove it from your password manager or use a different passkey.

## Remaining platform/hybrid limitation

Existing vault passkeys created before the vault-specific user-handle fix may already have been replaced locally by a later account passkey. Unlock with the vault password, remove the old vault passkey association, and register the vault passkey again once. New vault-only and account passkeys can then coexist on the same Apple device.

## Related docs

- `docs/PASSKEY_VAULT_LIFECYCLE.md`
- `docs/PASSKEY_VAULT_SETUP_AVAILABILITY_AUDIT.md`
- `SECURITY.md` — account vs vault passkey separation
- `CHANGELOG.md`
