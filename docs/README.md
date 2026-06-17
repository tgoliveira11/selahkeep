# LTG Vault — documentation index

**Product:** LTG Vault — a private encrypted space for letters, prayers, reflections, and notes.

Phases 0–5 of the MVP are **complete**. The active implementation domain is **notes + vault** (not letters).

## Source of truth (active)

| Document | Purpose |
|----------|---------|
| [`TDR_LTG_Vault_MVP.md`](./TDR_LTG_Vault_MVP.md) | Product and architecture direction |
| [`LTG_VAULT_IMPLEMENTATION_PLAN.md`](./LTG_VAULT_IMPLEMENTATION_PLAN.md) | Phased engineering plan (completed) |
| [`ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`](./ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md) | Vault crypto, note keys, recovery phrase |
| [`ADR-006_LTG_Vault_Passkey_PRF_Unlock.md`](./ADR-006_LTG_Vault_Passkey_PRF_Unlock.md) | Passkey PRF vault unlock |
| [`LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md`](./LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md) | MVP acceptance traceability |
| [`UI_UX_DIRECTION.md`](./UI_UX_DIRECTION.md) | Purple LTG Vault UI direction |
| [`LOGGED_IN_NAVIGATION_AUDIT.md`](./LOGGED_IN_NAVIGATION_AUDIT.md) | Logged-in nav structure |
| [`PRIVATE_USABILITY_TEST_SCRIPT.md`](./PRIVATE_USABILITY_TEST_SCRIPT.md) | Private usability test script |
| [`PASSKEY_LOGIN_VAULT_UNLOCK.md`](./PASSKEY_LOGIN_VAULT_UNLOCK.md) | Passkey login vs vault unlock integration |
| [`AUTH_RESET_TO_SECURE_AUTH.md`](./AUTH_RESET_TO_SECURE_AUTH.md) | Auth boundary (`@tgoliveira/secure-auth`) |
| [`MODULE_BOUNDARIES.md`](./MODULE_BOUNDARIES.md) | Module dependency rules |
| [`TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) | Test layers and coverage |
| [`VERCEL_ENVIRONMENT_VARIABLES.md`](./VERCEL_ENVIRONMENT_VARIABLES.md) | Deployment env vars |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | API overview |
| [`LTG_VAULT_AGENT_IMPLEMENTATION_GUIDE.md`](./LTG_VAULT_AGENT_IMPLEMENTATION_GUIDE.md) | Agent notes for vault + secure-auth integration |

## Root-level docs

| Document | Purpose |
|----------|---------|
| [`../README.md`](../README.md) | Setup, commands, quick start |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Layers, routes, data flow |
| [`../SECURITY.md`](../SECURITY.md) | Security model |
| [`../AGENTS.md`](../AGENTS.md) | Agent rules |

## Supporting (active, specialized)

| Document | Purpose |
|----------|---------|
| [`THREAT_MODEL_Private_Letters_Vault.md`](./THREAT_MODEL_Private_Letters_Vault.md) | Threat model (LTG Vault; filename retained for links) |
| [`LGPD_BETA_GATES.md`](./LGPD_BETA_GATES.md) | Pre-beta compliance gates |
| [`BACKUP_RESTORE_POLICY.md`](./BACKUP_RESTORE_POLICY.md) | Backup/restore policy |
| [`UTILITY_EXTRACTION_INVENTORY.md`](./UTILITY_EXTRACTION_INVENTORY.md) | Utility extraction inventory |

## Archive

Historical and superseded documents live under [`archive/`](./archive/). They are **not** active source-of-truth.

- [`archive/TDR_Private_Letters_Vault_MVP_Revised.md`](./archive/TDR_Private_Letters_Vault_MVP_Revised.md) — pre–LTG Vault TDR
- [`archive/adr/`](./archive/adr/) — ADR-001 through ADR-004 (superseded by ADR-005/006 + TDR)
- [`archive/migrations/`](./archive/migrations/) — completed secure-auth migration records
