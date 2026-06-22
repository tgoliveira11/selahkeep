# SelahKeep — documentation index

> Former working name: LTG Vault. Current product name: SelahKeep.

**Product:** SelahKeep — a private encrypted space for prayers, reflections, and notes.

Phases 0–5 of the MVP are **complete**. The active implementation domain is **notes + vault**.

## Source of truth (active)

| Document | Purpose |
|----------|---------|
| [`TDR_LTG_Vault_MVP.md`](./TDR_LTG_Vault_MVP.md) | Product and architecture direction |
| [`TDR_Note_Version_History.md`](./TDR_Note_Version_History.md) | Encrypted note version history + GitHub-style compare |
| [`TDR_Local_Voice_Notes.md`](./TDR_Local_Voice_Notes.md) | On-device voice-to-text note creation (EN/PT/ES) |
| [`LTG_VAULT_IMPLEMENTATION_PLAN.md`](./LTG_VAULT_IMPLEMENTATION_PLAN.md) | Phased engineering plan (completed) |
| [`ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`](./ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md) | Vault crypto, note keys, recovery phrase |
| [`ADR-006_LTG_Vault_Passkey_PRF_Unlock.md`](./ADR-006_LTG_Vault_Passkey_PRF_Unlock.md) | Passkey PRF vault unlock |
| [`LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md`](./LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md) | MVP acceptance traceability |
| [`UI_UX_DIRECTION.md`](./UI_UX_DIRECTION.md) | Purple SelahKeep UI direction |
| [`LOGGED_IN_NAVIGATION_AUDIT.md`](./LOGGED_IN_NAVIGATION_AUDIT.md) | Logged-in nav structure |
| [`AUTH_RESET_TO_SECURE_AUTH.md`](./AUTH_RESET_TO_SECURE_AUTH.md) | Auth boundary (`@tgoliveira/secure-auth`) |
| [`MODULE_BOUNDARIES.md`](./MODULE_BOUNDARIES.md) | Module dependency rules |
| [`SECURITY.md`](../SECURITY.md) | Security rules, search/reflection boundaries |
| [`TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) | Test layers and coverage |

## Supporting references

| Document | Purpose |
|----------|---------|
| [`PASSKEY_LOGIN_VAULT_UNLOCK.md`](./PASSKEY_LOGIN_VAULT_UNLOCK.md) | Passkey login vs vault unlock integration |
| [`PASSKEY_VAULT_UNLOCK_DIAGNOSTIC_AUDIT.md`](./PASSKEY_VAULT_UNLOCK_DIAGNOSTIC_AUDIT.md) | PRF diagnostics, capability vs ceremony |
| [`PASSKEY_VAULT_SETUP_AVAILABILITY_AUDIT.md`](./PASSKEY_VAULT_SETUP_AVAILABILITY_AUDIT.md) | Vault settings availability vs account passkey |
| [`VAULT_AUTO_LOCK_NORMALIZATION.md`](./VAULT_AUTO_LOCK_NORMALIZATION.md) | Auto-lock config, activity, draft hooks |
| [`NOTES_AUTOSAVE_AND_TEMPLATE_SWITCHING.md`](./NOTES_AUTOSAVE_AND_TEMPLATE_SWITCHING.md) | Encrypted drafts, autosave, templates (legacy) |
| [`NOTE_CREATE_EDIT_UX.md`](./NOTE_CREATE_EDIT_UX.md) | Field order, template categories, attachments placement |
| [`AUTOSAVE_BEHAVIOR.md`](./AUTOSAVE_BEHAVIOR.md) | Autosave triggers, UI states, no draft version history |
| [`ENCRYPTED_ATTACHMENTS.md`](./ENCRYPTED_ATTACHMENTS.md) | Client-encrypted attachments, limits, API |
| [`DICTATION_UX.md`](./DICTATION_UX.md) | Review-before-insert dictation flow |
| [`STORAGE_USAGE.md`](./STORAGE_USAGE.md) | Encrypted ciphertext storage metering |
| [`EDITOR_IMPLEMENTATION_DECISION.md`](./EDITOR_IMPLEMENTATION_DECISION.md) | Visual note editor (Tiptap) decision |
| [`TWO_FACTOR_MOBILE_FLOW_AUDIT.md`](./TWO_FACTOR_MOBILE_FLOW_AUDIT.md) | OAuth + TOTP mobile redirect flow |
| [`TRUSTED_DEVICES_REMOVAL.md`](./TRUSTED_DEVICES_REMOVAL.md) | Trusted devices removal record |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | API overview |
| [`VERCEL_ENVIRONMENT_VARIABLES.md`](./VERCEL_ENVIRONMENT_VARIABLES.md) | Deployment env vars |
| [`THREAT_MODEL_Private_Letters_Vault.md`](./THREAT_MODEL_Private_Letters_Vault.md) | Threat model |
| [`LGPD_BETA_GATES.md`](./LGPD_BETA_GATES.md) | Pre-beta compliance gates |
| [`BACKUP_RESTORE_POLICY.md`](./BACKUP_RESTORE_POLICY.md) | Backup/restore policy |
| [`UTILITY_EXTRACTION_INVENTORY.md`](./UTILITY_EXTRACTION_INVENTORY.md) | Phase 2 utility extraction |
| [`PRIVATE_USABILITY_TEST_SCRIPT.md`](./PRIVATE_USABILITY_TEST_SCRIPT.md) | Usability test script |

## Root-level docs

| Document | Purpose |
|----------|---------|
| [`../README.md`](../README.md) | Quick start, stack, commands |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Layers, data flow |
| [`../AGENTS.md`](../AGENTS.md) | Agent workflow rules |

Superseded letters-era ADRs, migration reports, and one-off implementation audits were removed from the repo; use ADR-005/006 and the TDR above for current guidance.
