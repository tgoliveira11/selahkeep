# SelahKeep — documentation index

> Former working name: LTG Vault. Current product name: SelahKeep.

**Product:** SelahKeep — a private encrypted space for prayers, reflections, and notes.

Phases 0–5 of the MVP are **complete**. The active implementation domain is **notes + vault** (not letters).

## Source of truth (active)

| Document | Purpose |
|----------|---------|
| [`TDR_LTG_Vault_MVP.md`](./TDR_LTG_Vault_MVP.md) | Product and architecture direction |
| [`LTG_VAULT_IMPLEMENTATION_PLAN.md`](./LTG_VAULT_IMPLEMENTATION_PLAN.md) | Phased engineering plan (completed); [Future Product Expansion Opportunities](./LTG_VAULT_IMPLEMENTATION_PLAN.md#future-product-expansion-opportunities) |
| [`ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`](./ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md) | Vault crypto, note keys, recovery phrase |
| [`ADR-006_LTG_Vault_Passkey_PRF_Unlock.md`](./ADR-006_LTG_Vault_Passkey_PRF_Unlock.md) | Passkey PRF vault unlock |
| [`LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md`](./LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md) | MVP acceptance traceability |
| [`UI_UX_DIRECTION.md`](./UI_UX_DIRECTION.md) | Purple SelahKeep UI direction |
| [`LOGGED_IN_NAVIGATION_AUDIT.md`](./LOGGED_IN_NAVIGATION_AUDIT.md) | Logged-in nav structure |
| [`PRIVATE_USABILITY_TEST_SCRIPT.md`](./PRIVATE_USABILITY_TEST_SCRIPT.md) | Private usability test script |
| [`PASSKEY_LOGIN_VAULT_UNLOCK.md`](./PASSKEY_LOGIN_VAULT_UNLOCK.md) | Passkey login vs vault unlock integration |
| [`PASSKEY_VAULT_UNLOCK_DIAGNOSTIC_AUDIT.md`](./PASSKEY_VAULT_UNLOCK_DIAGNOSTIC_AUDIT.md) | PRF diagnostics, Brave/macOS, capability vs ceremony |
| [`AUTH_RESET_TO_SECURE_AUTH.md`](./AUTH_RESET_TO_SECURE_AUTH.md) | Auth boundary (`@tgoliveira/secure-auth`) |
| [`MODULE_BOUNDARIES.md`](./MODULE_BOUNDARIES.md) | Module dependency rules |
| [`TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) | Test layers and coverage |
| [`VERCEL_ENVIRONMENT_VARIABLES.md`](./VERCEL_ENVIRONMENT_VARIABLES.md) | Deployment env vars |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | API overview |
| [`LTG_VAULT_AGENT_IMPLEMENTATION_GUIDE.md`](./LTG_VAULT_AGENT_IMPLEMENTATION_GUIDE.md) | Agent notes for vault + secure-auth integration |
| [`VAULT_AUTO_LOCK_NORMALIZATION.md`](./VAULT_AUTO_LOCK_NORMALIZATION.md) | Auto-lock config, activity, locked-state UI, draft hooks |
| [`EDITOR_IMPLEMENTATION_DECISION.md`](./EDITOR_IMPLEMENTATION_DECISION.md) | Visual note editor (Tiptap) decision and boundaries |

## Root-level docs

| Document | Purpose |
|----------|---------|
| [`../README.md`](../README.md) | Quick start, stack, commands |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Layers, data flow |
| [`../SECURITY.md`](../SECURITY.md) | Security rules and crypto summary |
| [`../AGENTS.md`](../AGENTS.md) | Agent workflow rules |

## Historical / archived

See [`archive/`](./archive/) for superseded ADRs, migration reports, and pre–SelahKeep documentation. Archived docs retain historical product names.
