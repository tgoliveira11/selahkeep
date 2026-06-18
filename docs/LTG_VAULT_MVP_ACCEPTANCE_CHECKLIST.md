# SelahKeep — MVP Acceptance Checklist

**Baseline:** Phase 5 hardening · TDR §20 + Phase 5 deliverables  
**Format:** Criterion | Status | Evidence | Tests | Notes

| # | Criterion | Status | Evidence | Tests | Notes |
|---|-----------|--------|----------|-------|-------|
| 1 | Authentication from `@tgoliveira/secure-auth` | ✅ Pass | `src/lib/secure-auth.ts`, auth API routes delegate to package | `secure-auth-env-and-imports.test.ts`, `no-local-auth-implementation.test.ts` | Package `@0.1.19-internal` — not modified |
| 2 | No competing local auth/account implementation | ✅ Pass | No local user password routes; register/login delegate | `no-local-auth-implementation.test.ts`, `password-storage.test.ts` | |
| 3 | Product branded **SelahKeep** on public pages | ✅ Pass | `home-copy.ts`, `nav.tsx`, `site-footer.tsx`, `layout.tsx` metadata | `home-page.test.tsx`, `site-layout.test.tsx`, `accessibility.test.tsx` | `APP_SLUG` remains `letters-to-god` for passkey continuity |
| 4 | User can create a vault | ✅ Pass | `/vault/setup`, `use-ltg-vault-setup.ts` | `vault-setup-crypto-integration.test.ts`, `vault-service.test.ts` | |
| 5 | User can set vault password/passphrase | ✅ Pass | vault setup flow, Argon2id envelope | `crypto-vault.test.ts`, `vault-setup-crypto-integration.test.ts`, `vault-setup-wizard.test.tsx` | Uses `PasswordSetupFields` + `VAULT_PASSWORD_*` policy |
| 6 | Vault password KDF uses **Argon2id only** | ✅ Pass | `src/lib/crypto-client/vault-kdf.ts` | `crypto-vault.test.ts`, ADR-005 | No PBKDF2 for new password envelopes |
| 7 | User can choose **12-word or 24-word** recovery phrase | ✅ Pass | `recovery-phrase.ts`, setup UI | `recovery-phrase.test.ts` (if present), manual `/vault/setup` | |
| 8 | User can confirm and store recovery phrase envelope | ✅ Pass | `recovery_phrase` envelope method | `vault-service.test.ts`, `vault-setup-crypto-integration.test.ts` | |
| 9 | User can unlock with vault password | ✅ Pass | `/vault/unlock`, `unlockFromVaultPassword` | `crypto-vault-unlock.test.ts` | |
| 10 | User can unlock with recovery phrase | ✅ Pass | `unlockFromRecoveryPhrase` | `crypto-vault-unlock.test.ts` | Legacy `recovery_code` still supported |
| 11 | User can associate passkey with vault unlock | ✅ Pass | `PasskeyVaultUnlockSetup`, enable-vault-unlock API | `passkey-vault-plaintext-rejection.test.ts`, API route tests | |
| 12 | User can unlock with compatible passkey vault envelope | ✅ Pass | `unlock-with-passkey.ts`, PRF envelope | `passkey-login-vault-unlock.test.ts` | |
| 13 | User can create/edit/delete/archive Markdown notes | ✅ Pass | `/notes`, `/notes/new`, `/notes/[id]` | `notes-ux.test.tsx`, `notes-routes.test.ts`, `note-service.test.ts` | Title required on create; soft delete via `deleted_at` |
| 14 | User can assign one category and multiple tags per note | ✅ Pass | `CategoryTagFields`, `TagChipInput`, encrypted vault index | `category-tag-crypto.test.ts`, `tag-normalization.test.ts`, `notes-ux.test.tsx` | Tags normalized; `#` display-only |
| 15 | User can mark notes as answered | ✅ Pass | Encrypted metadata `answered` flag | `answered-metadata.test.ts`, `notes-ux.test.tsx` | Not on `/notes/new` |
| 16 | User can search by title/tag/category after unlock | ✅ Pass | `note-search.ts`, `NoteFilters` | `note-search.test.ts`, `notes-ux.test.tsx` | Filters visible only when organizers exist |
| 17 | Titles visible in UI after unlock; **not** plaintext at rest | ✅ Pass | `encrypted_metadata` column only | `schema-no-plaintext.test.ts`, `default-title-encryption.test.ts` | |
| 18 | Tags/categories/body not plaintext at rest | ✅ Pass | Encrypted metadata + body | `schema-no-plaintext.test.ts`, `notes-plaintext-rejection.test.ts` | |
| 19 | APIs do not receive plaintext note content | ✅ Pass | `note-plaintext-rejection.ts` policies | `notes-plaintext-rejection.test.ts`, `plaintext-rejection.test.ts`, sentinel tests | |
| 20 | Vault password, recovery phrase, UVK, Note Keys, PRF output do not leave browser | ✅ Pass | Client-only crypto layer | `api-boundary.test.ts`, `sentinel-phrase.test.ts` | |
| 21 | Account password reset does **not** unlock vault | ✅ Pass | `ACCOUNT_PASSWORD_VAULT_NOTE` in reset email | `phase5-security-regression.test.ts` | OAuth/password reset are account-only |
| 22 | Account deletion deletes vault and encrypted notes | ✅ Pass | FK `onDelete: cascade` users → vaults → notes; package DELETE | `account-deletion-cascade.test.ts` | DB cascade; package deletes user row |
| 23 | Export/import documented as unavailable before public beta | ✅ Pass | `/vault/settings`, `home-copy.ts`, README, SECURITY | `home-page.test.tsx` | No import/export implementation |
| 24 | Encrypted attachments not in MVP | ✅ Pass | No `note_attachments` table | `no-letters-domain.test.ts`, TDR §11 | Documented as deferred |
| 25 | Build, lint, tests, and coverage pass | ✅ Pass | CI commands in AGENTS.md | `npm run lint`, `test:coverage`, `build` | ≥90% enforced scope |
| 26 | Public pages explain SelahKeep direction clearly | ✅ Pass | Home page sections: vault vs account, deferred features | `home-page.test.tsx` | |
| 27 | Vault inactivity lock (15 min default) | ✅ Pass | `vault-session.ts` `VAULT_INACTIVITY_MS`, `use-vault-activity.ts` | `vault-session.test.ts`, `phase5-security-regression.test.ts` | Documented in README/SECURITY |
| 28 | Inactivity lock shows calm user notice | ✅ Pass | `vault-auto-lock-notice.tsx`, `configureVaultAutoLock` | `phase5-security-regression.test.ts` | Message: vault locked to protect private notes |
| 29 | Inactivity lock clears decrypted note body cache | ✅ Pass | `lockVaultSession` → `clearNoteBodyCache` | `vault-session.test.ts`, `phase5-security-regression.test.ts` | |
| 30 | Logout locks vault and clears client state | ✅ Pass | `nav.tsx` `lockVaultSession` + `clearVaultClientState` | `phase5-security-regression.test.ts` | |
| 31 | No active letters domain | ✅ Pass | Letters routes/modules removed | `no-letters-domain.test.ts` | |
| 32 | Mobile UX: touch targets, no horizontal overflow | ✅ Pass | `globals.css`, `note-filters.tsx`, `markdown-editor.tsx` | Manual + layout tests | `min-h-11` on filters; `overflow-x: hidden` |
| 33 | Accessibility smoke (axe) on core pages | ✅ Pass | `accessibility.test.tsx` | jest-axe on home, login, register, account-deleted | |
| 34 | Account deletion warning mentions vault + notes | ✅ Pass | `ACCOUNT_DELETION_VAULT_NOTE` on settings page | `account-deletion-page.test.tsx` | |
| 35 | Deployment docs updated (no console email in prod) | ✅ Pass | `VERCEL_ENVIRONMENT_VARIABLES.md`, `secure-auth-deployment-checklist.md`, README deploy | Manual review | OAuth callbacks documented |
| 36 | Vault status distinguishes not configured / setup incomplete / locked / unlocked | ✅ Pass | `GET /api/vault/status`, `useVaultClientStatus`, `NotesVaultIndicator`, nav badge | `vault-status.test.ts`, `vault-status-ui.test.tsx`, `notes-ux.test.tsx` | `/notes` vault open/closed visual |
| 37 | `/vault/recovery` status-gated; recovery phrase replace (not initial generation) | ✅ Pass | `/vault/recovery`, `POST /api/vault/recovery-phrase` | `vault-recovery-page.test.tsx`, `recovery-phrase-route.test.ts`, `vault-service.test.ts` | Legacy `recovery_code` unlock only; no "Do this later" |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | Phase 5 complete |
| Security review | | | Pre-beta gate per `LGPD_BETA_GATES.md` |
| Private usability | | | See `PRIVATE_USABILITY_TEST_SCRIPT.md` |

**Related:** [`TDR_LTG_Vault_MVP.md`](./TDR_LTG_Vault_MVP.md) §20, [`LTG_VAULT_IMPLEMENTATION_PLAN.md`](./LTG_VAULT_IMPLEMENTATION_PLAN.md) Phase 5
