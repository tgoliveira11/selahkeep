# SelahKeep — Passkey vault lifecycle

**Date:** 2026-06-19  
**Product:** SelahKeep  
**Status:** Implemented

---

## Overview

Vault passkeys (`signInEnabled: false`, `vaultUnlockEnabled: true`) are independent from account passkeys. This document describes registration, unlock, disable/removal, and re-registration behavior.

---

## Registration (vault-only)

Route: `POST /api/passkeys/register` with `{ action: "options" | "verify", vaultOnly: true, prfVaultEnvelope: true }`.

### WebAuthn options (vault-only)

```ts
authenticatorSelection: {
  authenticatorAttachment: "platform",
  residentKey: "preferred",
  userVerification: "required"
}
```

- Applied **only** to vault passkey registration (`vaultOnly: true`).
- Account passkey registration via `@tgoliveira/secure-auth` is unchanged.

### excludeCredentials (MVP)

- Exclude **only** active vault-enabled credentials (`vaultUnlockEnabled === true`).
- Do **not** exclude revoked or disabled vault credentials.
- Do **not** exclude account-only credentials (`signInEnabled: true`, `vaultUnlockEnabled: false`).
- MVP allows one active vault passkey per account/browser credential.

### PRF envelope

- Server stores `passkey_authorized_device` envelope with `prfRequired: true`.
- PRF output never leaves the browser; server receives encrypted envelope only.

---

## Vault unlock

Route: `POST /api/passkeys/authenticate` with `{ action: "options" | "verify", purpose: "vault_unlock" }`.

- `allowCredentials`: only `vaultUnlockEnabled === true` credentials.
- Stored `transports` replayed in `allowCredentials`.
- PRF extension: `eval` (one vault credential) or `evalByCredential` (multiple).
- Verify fails closed without envelope or PRF at client unwrap.
- Account-only credentials rejected on verify.

Shared client helper: `src/lib/passkey/vault-unlock-authenticate.ts`.

---

## Disable / remove vault unlock

Route: `DELETE /api/account/passkeys/:id/vault-unlock` (or `POST` disable-verify) with PRF ceremony proof.

### Vault-only credential

When `signInEnabled: false` and vault unlock is disabled:

1. Revoke matching `passkey_authorized_device` envelope.
2. **Revoke** the credential row (`revokedAt` set) — no orphaned credential blocking re-registration.
3. Record `passkey_vault_unlock_disabled` and `passkey_removed` audit events.

### Dual-purpose credential

When `signInEnabled: true` and vault unlock is disabled:

1. Revoke matching PRF envelope only.
2. Set `vaultUnlockEnabled: false`; keep credential for account sign-in.
3. Record `passkey_vault_unlock_disabled` only.

### Account-only removal

Deleting an account passkey via `@tgoliveira/secure-auth` does **not** touch vault passkeys.

---

## Re-registration after disable

After vault-only disable:

- Credential row is revoked — not in `excludeCredentials` for new vault setup.
- No active envelope — registration verify creates fresh envelope.
- User can register a new platform vault passkey on the same device.

If the browser still holds a platform passkey in the password manager, registration may fail with:

> This passkey already exists on this device. Remove it from your password manager or use a different passkey.

---

## Development diagnostics

Dev-only vault unlock option logging (`NODE_ENV === "development"`):

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

Never logs credential IDs, secrets, or PRF output.

---

## Related docs

- `docs/PASSKEY_TOUCH_ID_QR_PROMPT_FIX.md`
- `docs/PASSKEY_VAULT_SETUP_AVAILABILITY_AUDIT.md`
- `SECURITY.md` — account vs vault passkey separation
