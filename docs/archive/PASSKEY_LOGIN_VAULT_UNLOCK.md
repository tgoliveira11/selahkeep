> **⚠️ ARCHIVED — obsolete (2026-07-03).** Superseded by `@tgoliveira/vault-core` as the single source of truth for vault and passkey PRF unlock behavior. See the package's `README.md`, `docs/IMPLEMENTATION_GUIDE.md`, and `PASSKEY_PRF_ENVELOPES.md`. Kept for historical context only — do not use for current implementation guidance.

---

# Passkey Account Login and Vault Unlock

Last updated: 2026-06-19

## Core rule

```text
Account passkey sign-in authenticates the account only.
Passkey vault unlock is a separate, explicit action performed after sign-in.
```

The same physical credential may support both actions, but SelahKeep never treats account login as
vault unlock. Vault unlock additionally requires a valid PRF envelope and browser/authenticator PRF
support.

## Account passkey sign-in

| Layer | Location | Role |
|-------|----------|------|
| Login UI | `@tgoliveira/secure-auth/react` `LoginPage` | Starts account passkey authentication |
| Options | `POST /api/auth/passkey/login/options` | Pure `secure-auth` package delegate |
| Verify | `POST /api/auth/passkey/login/verify` | Pure `secure-auth` package delegate |
| Result | `/notes` | Account session exists; vault remains locked |

The app does not alias or replace `@tgoliveira/secure-auth/react/client`, request vault PRF output
during login, fetch vault envelopes with a login token, or unwrap the User Vault Key in the login flow.

## Explicit vault unlock

After authentication, the user chooses **Unlock with passkey** from `/vault/unlock` or the vault
status dock. The product-owned flow is:

1. `POST /api/passkeys/authenticate` with `action: "options"`.
2. A separate WebAuthn ceremony requests PRF output.
3. `POST /api/passkeys/authenticate` with `action: "verify"`.
4. The client unwraps the User Vault Key from the matching PRF envelope.
5. The in-memory vault session becomes unlocked.

Implementation: `src/features/passkey/unlock-with-passkey.ts`.

## Configuration

Adding an account passkey does not automatically authorize it for vault unlock. While the vault is
open, `/vault/settings` performs a separate PRF ceremony and creates the vault envelope through
`POST /api/account/passkeys/:id/enable-vault-unlock`.

## Outcomes

| Action | Account | Vault |
|--------|---------|-------|
| Sign in with account passkey | Signed in | Locked |
| Unlock with configured PRF passkey | Already signed in | Unlocked |
| Unlock with unconfigured/incompatible passkey | Already signed in | Locked; password and recovery phrase remain available |

## Tests

- `src/test/security/passkey-login-vault-unlock.test.ts` enforces the separation and removal of login coupling.
- `src/test/features/unlock-with-passkey.test.ts` covers the explicit vault ceremony.
- `src/test/features/passkey-vault-unlock-settings.test.tsx` covers enable/test/disable management.

See `docs/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md`.
