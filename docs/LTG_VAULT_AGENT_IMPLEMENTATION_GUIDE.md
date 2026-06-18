# SelahKeep — agent implementation guide

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
| Owner | `@tgoliveira/secure-auth` | SelahKeep (client crypto) |
| Env | `AUTH_PASSWORD_*` | `VAULT_PASSWORD_*` |
| Purpose | Sign in | Unlock private notes |
| Server | bcrypt hash | never sent |

## Recovery phrase replacement (`/vault/recovery`)

- Requires authenticated session and **unlocked vault** (UVK in browser memory only).
- User generates a new 12- or 24-word BIP39 phrase client-side; shown once with confirmation.
- Client wraps UVK with Argon2id (`wrapVaultKeyForRecoveryPhrase`) and posts encrypted envelope to `POST /api/vault/recovery-phrase`.
- Server atomically revokes the previous `recovery_phrase` envelope and creates a new one (`recovery_phrase_replaced` audit).
- Plaintext recovery phrase and UVK **never** sent to the server.
- Configured configured vaults always have a `recovery_phrase` envelope from setup — `/vault/recovery` offers **Replace recovery phrase**, not initial generation.
- Legacy `recovery_code` envelopes: unlock-only on `/vault/unlock`; no new generation on `/vault/recovery`.

See `docs/VAULT_RECOVERY_FLOW_AUDIT.md`.

## Notes UX (`/notes`, `/notes/new`, `/notes/[id]`)

- **Title required** on create; validated client-side before `encryptNote`.
- **Answered** defaults to `false` on create; toggle only on detail/edit.
- **Search/filters** on `/notes` when ≥1 category or tag exists (`hasNoteOrganizers`).
- **Tags:** `src/lib/notes/tag-normalization.ts` — max **32** chars; display `#` prefix only in UI.
- **Vault indicator:** `NotesVaultIndicator` on `/notes` for locked/open states.
- **Markdown preview:** `sanitize-markdown.ts` (`marked` + `dompurify`) and `MarkdownPreview` component — client-side only after vault unlock; no crypto changes.

## Related docs

- `docs/TDR_LTG_Vault_MVP.md`
- `docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`
- `docs/FIRST_RUN_USER_FLOW_AUDIT.md`
- `docs/AUTH_RESET_TO_SECURE_AUTH.md`
