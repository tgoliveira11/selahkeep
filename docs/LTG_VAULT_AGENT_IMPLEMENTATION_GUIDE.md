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

## Two-factor login challenge (pre-auth)

- Pending 2FA is **not** a fully authenticated session — do not render logged-in nav, vault dock, or notes/vault routes before verification succeeds.
- Route: `/login/2fa` (`src/app/(auth)/login/2fa/page.tsx`); credentials mode uses native POST (`?mode=credentials`); OAuth uses app-owned `OAuthTwoFactorChallenge` (session refresh before redirect).
- Post-login redirect: `sanitizeAuthCallbackUrl` in `src/lib/auth/safe-auth-callback.ts`; proxy preserves safe `callbackUrl` when gating pending 2FA.
- Session helpers: `isFullyAuthenticatedSession` / `isPendingTwoFactorSession` in `src/lib/auth/session-state.ts`.
- See `docs/TWO_FACTOR_MOBILE_FLOW_AUDIT.md`.

## Recovery phrase replacement (`/vault/recovery`)

- Requires authenticated session and **unlocked vault** (UVK in browser memory only).
- User generates a new 12- or 24-word BIP39 phrase client-side; shown once with confirmation.
- Client wraps UVK with Argon2id (`wrapVaultKeyForRecoveryPhrase`) and posts encrypted envelope to `POST /api/vault/recovery-phrase`.
- Server atomically revokes the previous `recovery_phrase` envelope and creates a new one (`recovery_phrase_replaced` audit).
- Plaintext recovery phrase and UVK **never** sent to the server.
- Configured configured vaults always have a `recovery_phrase` envelope from setup — `/vault/recovery` offers **Replace recovery phrase**, not initial generation.
- Legacy `recovery_code` envelopes: unlock-only on `/vault/unlock`; no new generation on `/vault/recovery`.

See `docs/VAULT_RECOVERY_FLOW_AUDIT.md`.

## Vault security review (`/vault/security`)

- Entry from `/vault/settings` → **Open security review**.
- Gated by account session + vault setup phase; full review (including recovery drill) requires unlocked vault.
- Recovery drill: `verifyRecoveryPhraseDrill` in `src/lib/crypto-client/recovery-drill.ts` — local unwrap only; never rotates/replaces envelopes; phrase never sent to server.
- Event log: existing `audit_events` via `GET/POST /api/vault/security-events`; safe metadata only (`method` labels).
- See `docs/VAULT_SECURITY_REVIEW_IMPLEMENTATION.md`.

## Notes UX (`/notes`, `/notes/new`, `/notes/[id]`)

- **Title required** on create; validated client-side before `encryptNote`.
- **Resolved** maps to internal `answered`; list + detail icon toggle (`NoteResolvedToggle`); edit-mode toggle in category fields; encrypted metadata + vault index update via `toggleNoteResolved`.
- **Search/filters** on `/notes` when ≥1 category or tag exists (`hasNoteOrganizers`); **smart local filters** always available; note counter (`formatNoteCount`) and sort (`note-sort.ts`, pinned first) when unlocked.
- **Lifecycle:** pin, favorite, archive, trash (client metadata), restore, permanent delete (server soft delete + index removal), duplicate (new Note Key). See `docs/NOTE_ORGANIZATION_LIFECYCLE_TRACK_3_IMPLEMENTATION.md`.
- **Saved views:** encrypted in vault index v3; cards/list view preference in `localStorage` (`selahkeep:notes:view-mode`).
- **Tags:** `src/lib/notes/tag-normalization.ts` — max **32** chars; display `#` prefix only in UI.
- **Vault status dock:** narrow popover in `Nav`; quick password/passkey unlock; recovery phrase on `/vault/unlock`; dock forced collapsed on that route; `/notes` locked card explains vault model and offers unlock actions.
- **Top nav:** Notes, Vault, Account, Sign out only — no lock/unlock badges or vault status text.
- **Note editor:** visual (WYSIWYG) default via Tiptap; Markdown canonical; expert `</>` mode with textarea + sanitized preview. See [`EDITOR_IMPLEMENTATION_DECISION.md`](./EDITOR_IMPLEMENTATION_DECISION.md).
- **Markdown preview:** `sanitize-markdown.ts` + `MarkdownPreview` — interactive checklists toggle `[ ]` ↔ `[x]` in source via `markdown-checklist.ts`; view mode persists through `updateNote`; expert-mode preview updates editor only.
- **Inactivity:** `useVaultActivity` resets `touchVaultSession` on click, keydown, input, focusin, scroll, pointerdown, touchstart.

## Related docs

- `docs/TDR_LTG_Vault_MVP.md`
- `docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`
- `docs/FIRST_RUN_USER_FLOW_AUDIT.md`
- `docs/AUTH_RESET_TO_SECURE_AUTH.md`
