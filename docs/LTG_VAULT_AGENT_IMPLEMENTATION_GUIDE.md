# LTG Vault — agent implementation guide

**Scope:** Product-owned vault flows that integrate with `@tgoliveira/secure-auth` without duplicating account auth.

## Vault password setup (`/vault/setup`)

- Uses `PasswordSetupFields` from `@tgoliveira/secure-auth/react/client` (re-exported via `src/lib/secure-auth/vault-passkey-react-client.ts` shim).
- Vault password policy is **app-owned** in `src/lib/config/vault-password-policy.ts` and passed explicitly as the `policy` prop.
- The secure-auth package **never reads env vars** for generic password components — map `VAULT_PASSWORD_*` in the app and pass the resolved policy.
- Vault password is validated client-side only (`validatePasswordSetup`); Argon2id KDF wraps the User Vault Key after validation.
- Vault password **never** leaves the browser and is **not** sent to any API.

## Account auth vs vault password

| | Account password | Vault password |
|---|------------------|----------------|
| Owner | `@tgoliveira/secure-auth` | LTG Vault (client crypto) |
| Env | `AUTH_PASSWORD_*` | `VAULT_PASSWORD_*` |
| Purpose | Sign in | Unlock private notes |
| Server | bcrypt hash | never sent |

## Related docs

- `docs/TDR_LTG_Vault_MVP.md`
- `docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`
- `docs/FIRST_RUN_USER_FLOW_AUDIT.md`
- `docs/AUTH_RESET_TO_SECURE_AUTH.md`
