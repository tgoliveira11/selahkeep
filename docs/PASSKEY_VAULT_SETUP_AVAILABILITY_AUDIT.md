# SelahKeep — Passkey vault setup availability audit

**Date:** 2026-06-16  
**Product:** SelahKeep  
**Status:** Updated — vault passkeys independent from account passkeys

---

## Account passkeys and vault passkeys

Account passkeys and vault passkeys are **independent**.

- An **account passkey** signs the user in to SelahKeep (`@tgoliveira/secure-auth`).
- A **vault passkey** unlocks the encrypted vault using WebAuthn PRF after the user is signed in.

Users may configure vault passkey unlock **without** first configuring account passkey sign-in, provided the vault is unlocked and the browser/passkey provider supports WebAuthn PRF.

Signing in with an account passkey never unlocks the vault by itself.

Four valid combinations: account only, vault only, both, neither.

---

## Previous root cause (fixed)

`/vault/settings` listed only account login passkeys from `passkeyAccountApi.list()`. Users without account passkeys saw misleading prerequisite messaging even when WebAuthn PRF was available.

That requirement was a **UI/architecture coupling mistake**, not a browser limitation.

---

## Current model

### Vault passkey setup ceremony

- Route: `POST /api/passkeys/register` with `vaultOnly: true` and `prfVaultEnvelope: true`
- Creates credential with `signInEnabled: false`, `vaultUnlockEnabled: true`
- Stores `passkey_authorized_device` envelope (PRF required)
- PRF output stays client-side; server receives encrypted envelope only

### Optional dual capability

An account passkey may also enable vault unlock via `POST /api/account/passkeys/:id/enable-vault-unlock` — **optional**, not required for vault passkey setup.

### Availability states

`deriveVaultPasskeyAvailability()` in `src/lib/passkey/vault-passkey-availability.ts`:

- Does **not** consider account passkey count
- Considers: vault configured, vault unlocked (for setup), envelope configured, browser/PRF probe

---

## Security rules (unchanged)

- WebAuthn PRF output only — no assertion signatures as keys
- No non-PRF fallback
- No PRF output, UVK, or decrypted payloads sent to server
- Configured envelopes are read-only in PRF-incompatible browsers (not deleted)

---

## Files

| Area | Path |
| --- | --- |
| Availability | `src/lib/passkey/vault-passkey-availability.ts` |
| Copy | `src/lib/passkey/vault-passkey-availability-messages.ts` |
| Settings UI | `src/features/passkey/passkey-vault-unlock-setup.tsx` |
| Vault-only register | `src/app/api/passkeys/register/route.ts`, `passkey-service.ts` |
| List vault passkeys | `GET /api/passkeys/vault-unlock` |

---

## Rollback

Revert vault-only registration and availability model; restore account-passkey-linked setup only if product decision reverses (document in SECURITY.md first).
