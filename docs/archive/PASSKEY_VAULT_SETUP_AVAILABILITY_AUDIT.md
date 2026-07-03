> **⚠️ ARCHIVED — obsolete (2026-07-03).** Superseded by `@tgoliveira/vault-core` as the single source of truth for vault and passkey PRF unlock behavior. See the package's `README.md`, `docs/IMPLEMENTATION_GUIDE.md`, and `PASSKEY_PRF_ENVELOPES.md`. Kept for historical context only — do not use for current implementation guidance.

---

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

### Vault passkey unlock authenticate purpose

When the user unlocks the vault with a passkey (dock, `/vault/unlock`, or settings Test), the client calls:

```text
POST /api/passkeys/authenticate
{ action: "options" | "verify", purpose: "vault_unlock" }
```

Server behavior for `purpose: "vault_unlock"`:

1. `allowCredentials` includes **only** credentials where `vaultUnlockEnabled === true`.
2. Account-only passkeys (`signInEnabled: true`, `vaultUnlockEnabled: false`) are **excluded**.
3. Stored WebAuthn **transports** are replayed in `allowCredentials` when available (not stripped client-side).
4. If no vault-enabled passkeys exist, the server returns a clear error before WebAuthn starts.
5. Verify rejects account-only credentials and never returns `verified: true` with a null envelope.
6. Multiple vault credentials use `passkeyPrfAuthExtensions(userId, credentialIds)` (`evalByCredential`).

Shared client helper: `src/lib/passkey/vault-unlock-authenticate.ts` — used by settings Test, real unlock, and dock unlock. Filtering to a specific credential preserves the matching server entry including `transports`.

See `docs/PASSKEY_TOUCH_ID_QR_PROMPT_FIX.md` for Touch ID vs QR-code prompt regression details.

`/api/vault/status` is **not** required for the passkey unlock ceremony (envelope comes from authenticate verify). A transient 401 on status is unrelated noise unless it blocks the whole vault UI; it does not clear a successful vault session after unlock.

No `@tgoliveira/vault-core` change was required for this fix.

### Vault passkey setup ceremony

- Route: `POST /api/passkeys/register` with `vaultOnly: true` and `prfVaultEnvelope: true` on both **options** and **verify**
- Registration options: `authenticatorAttachment: "platform"`, `userVerification: "required"` (vault-only only)
- `excludeCredentials`: only active `vaultUnlockEnabled` credentials — account-only passkeys are **not** excluded
- Creates credential with `signInEnabled: false`, `vaultUnlockEnabled: true`
- Stores `passkey_authorized_device` envelope (PRF required)
- PRF output stays client-side; server receives encrypted envelope only
- See `docs/PASSKEY_VAULT_LIFECYCLE.md` for disable/re-registration lifecycle

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
| Vault unlock authenticate | `POST /api/passkeys/authenticate` with `purpose: "vault_unlock"` |
| Shared unlock client | `src/lib/passkey/vault-unlock-authenticate.ts` |
| Transport helpers | `src/lib/passkey/passkey-transports.ts` |
| Touch ID / QR fix doc | `docs/PASSKEY_TOUCH_ID_QR_PROMPT_FIX.md` |

---

## Rollback

Revert vault-only registration and availability model; restore account-passkey-linked setup only if product decision reverses (document in SECURITY.md first).
