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
| 11 | User can associate passkey with vault unlock | ✅ Pass | `/vault/settings` `PasskeyVaultUnlockSetup`, enable-vault-unlock API | `passkey-vault-unlock-settings.test.tsx`, `passkey-vault-plaintext-rejection.test.ts` | |
| 12 | User can unlock with compatible passkey vault envelope | ✅ Pass | `unlock-with-passkey.ts`, PRF envelope | `passkey-login-vault-unlock.test.ts` | |
| 13 | User can create/edit/delete/archive Markdown notes | ✅ Pass | `/notes`, `/notes/new`, `/notes/[id]` | `notes-ux.test.tsx`, `notes-routes.test.ts`, `note-service.test.ts`, `note-org-metadata.test.ts` | Trash = client metadata; permanent delete = server soft delete |
| 14 | User can assign one category and multiple tags per note | ✅ Pass | `CategoryTagFields`, `TagChipInput`, encrypted vault index | `category-tag-crypto.test.ts`, `tag-normalization.test.ts`, `notes-ux.test.tsx`, `notes-new-field-order.test.tsx` | Tags normalized; `#` display-only; template categories on save; reserved names blocked |
| 15 | User can mark notes as answered | ✅ Pass | Encrypted metadata `answered` flag | `answered-metadata.test.ts`, `notes-ux.test.tsx` | Not on `/notes/new` |
| 16 | User can search by title/body/tag/category after unlock | ✅ Pass | Track 4: `note-search.ts`, `note-text-search.ts`, `use-note-search-bodies.ts`, `NotesListControls` | `note-search.test.ts`, `note-text-search.test.ts`, `notes-search-security.test.ts` | Client-only query; body decrypt in memory; snippets + highlights |
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
| 27 | Vault inactivity lock (15 min default, env configurable) | ✅ Pass | `vault-auto-lock-config.ts`, `vault-session.ts`, `use-vault-activity.ts` | `vault-auto-lock-config.test.ts`, `vault-session.test.ts`, `vault-activity.test.tsx` | See `docs/VAULT_AUTO_LOCK_NORMALIZATION.md` |
| 28 | Inactivity lock shows calm user notice | ✅ Pass | `vault-auto-lock-notice.tsx`, `configureVaultAutoLock` | `vault-auto-lock-notice.test.tsx`, `vault-auto-lock-normalization.test.tsx` | Writing routes mention encrypted draft save |
| 42 | Vault auto-lock normalization (locked copy, editor activity, draft before lock) | ✅ Pass | `VaultLockedState`, `registerVaultBeforeAutoLock`, `touchVaultActivity` | `vault-auto-lock-normalization.test.tsx`, `vault-auto-lock-draft.test.ts`, `notes-vault-locked-state.test.tsx`, `notes-autosave-template-switch.test.tsx` | `/notes/new` no longer uses `VaultAccessGate`; template switch is immediate |
| 29 | Inactivity lock clears decrypted note body cache | ✅ Pass | `lockVaultSession` → `clearNoteBodyCache` | `vault-session.test.ts`, `phase5-security-regression.test.ts` | |
| 30 | Logout locks vault and clears client state | ✅ Pass | `nav.tsx` `lockVaultSession` + `clearVaultClientState` | `phase5-security-regression.test.ts` | |
| 31 | No active letters domain | ✅ Pass | Letters routes/modules removed | `no-letters-domain.test.ts` | |
| 32 | Mobile UX: touch targets, no horizontal overflow | ✅ Pass | `globals.css`, `note-filters.tsx`, `markdown-editor.tsx`, `editor-toolbar.tsx` | Manual + layout tests | `min-h-11` on filters/toolbar; visual editor responsive |
| 39 | Visual note editor (WYSIWYG default) + Markdown expert mode | ✅ Pass | `markdown-editor.tsx`, `visual-note-editor.tsx`, `EDITOR_IMPLEMENTATION_DECISION.md` | `markdown-editor.test.tsx`, `visual-note-editor.test.tsx`, `notes-ux.test.tsx` | Markdown canonical; `</>` expert toggle |
| 33 | Accessibility smoke (axe) on core pages | ✅ Pass | `accessibility.test.tsx` | jest-axe on home, login, register, account-deleted | |
| 34 | Account deletion warning mentions vault + notes | ✅ Pass | `ACCOUNT_DELETION_VAULT_NOTE` on settings page | `account-deletion-page.test.tsx` | |
| 35 | Deployment docs updated (no console email in prod) | ✅ Pass | `VERCEL_ENVIRONMENT_VARIABLES.md`, `secure-auth-deployment-checklist.md`, README deploy | Manual review | OAuth callbacks documented |
| 36 | Vault status distinguishes not configured / setup incomplete / locked / unlocked | ✅ Pass | `GET /api/vault/status`, `useVaultClientStatus`, `VaultStatusDock` in authenticated `Nav` header | `vault-status.test.ts`, `vault-status-ui.test.tsx`, `vault-status-dock.test.tsx`, `notes-vault-locked-state.test.tsx`, `route-scroll-to-top.test.tsx`, `notes-ux.test.tsx` | Narrow dock; quick unlock; recovery on `/vault/unlock`; dock collapsed on unlock page; `/notes` locked card; route scroll-to-top |
| 40 | Two-factor challenge is pre-auth; mobile redirect + safe callback | ✅ Pass | `/login/2fa`, `session-state.ts`, `safe-auth-callback.ts`, `oauth-two-factor-challenge.tsx`, `proxy.ts` | `two-factor-challenge.test.tsx`, `session-state.test.ts`, `safe-auth-callback.test.ts`, `site-layout.test.tsx`, `proxy.test.ts` | No logged-in nav during pending 2FA; OAuth waits for session refresh; see `docs/TWO_FACTOR_MOBILE_FLOW_AUDIT.md` |
| 38 | Interactive Markdown checklists with encrypted persistence | ✅ Pass | `markdown-checklist.ts`, `MarkdownPreview`, note detail view save | `markdown-checklist.test.ts`, `markdown-preview.test.tsx`, `notes-ux.test.tsx` | Source markdown is source of truth |
| 39 | Notes list resolve action, dates, sort, counter | ✅ Pass | `note-card.tsx`, `note-sort.ts`, `note-count.ts`, `notes/page.tsx` | `note-sort.test.ts`, `note-count.test.ts`, `notes-ux.test.tsx` | Client-side after vault unlock |
| 41 | Note organization lifecycle (pin, favorite, archive, trash, filters, saved views, duplicate) | ✅ Pass | Track 3 + UI refinement | `note-metadata.test.ts`, `smart-filters.test.ts`, `saved-views.test.ts`, `duplicate-note.test.ts`, `note-org-metadata.test.ts`, `notes-refinements.test.tsx`, `notes-ui-patterns.test.tsx` | Smart filter chips; saved views menu; compact toolbar |
| 37 | `/vault/recovery` status-gated; recovery phrase replace (not initial generation) | ✅ Pass | `/vault/recovery`, `POST /api/vault/recovery-phrase` | `vault-recovery-page.test.tsx`, `recovery-phrase-route.test.ts`, `vault-service.test.ts` | Legacy `recovery_code` unlock only; no "Do this later" |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | Phase 5 complete |
| Security review | `/vault/security` — health summary, recovery drill, event log | ✅ Pass | `docs/VAULT_SECURITY_REVIEW_IMPLEMENTATION.md` | `vault-security-page.test.tsx`, `vault-security-review.test.tsx`, `recovery-drill.test.ts` | No secret material exposed |
| Private usability | | | See `PRIVATE_USABILITY_TEST_SCRIPT.md` |

**Related:** [`TDR_LTG_Vault_MVP.md`](./TDR_LTG_Vault_MVP.md) §20, [`LTG_VAULT_IMPLEMENTATION_PLAN.md`](./LTG_VAULT_IMPLEMENTATION_PLAN.md) Phase 5
