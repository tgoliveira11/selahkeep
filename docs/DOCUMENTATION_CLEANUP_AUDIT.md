# Documentation Cleanup Audit — LTG Vault

**Date:** 2026-06-16  
**Scope:** Full documentation inventory and cleanup for LTG Vault MVP (Phases 0–5 complete).  
**Constraint:** No application behavior, database schema, auth behavior, or vault crypto changes.

## Summary

| Action | Count |
|--------|------:|
| Kept (active, current) | 28 |
| Updated | 22 |
| Archived | 13 |
| Deleted | 0 |
| Created | 3 |

**Active source of truth:** `docs/TDR_LTG_Vault_MVP.md`, `docs/LTG_VAULT_IMPLEMENTATION_PLAN.md`, `docs/ADR-005_*`, `docs/ADR-006_*`, `docs/LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md`, `docs/UI_UX_DIRECTION.md`, `SECURITY.md`, `ARCHITECTURE.md`, `README.md`, `AGENTS.md`.

**Documentation index:** [`docs/README.md`](./README.md)  
**Archive index:** [`docs/archive/README.md`](./archive/README.md)

---

## Root-level documentation

| File | Current purpose | Status | Reason | Action taken |
|------|-----------------|--------|--------|--------------|
| `README.md` | Setup, commands, LTG Vault overview | **update** | Still referenced old ADRs and letters framing | Updated product description, doc links, notes/vault routes, secure-auth boundary |
| `ARCHITECTURE.md` | Layers, routes, data flow | **update** | Letters domain and old ADR refs | Rewritten for notes/vault, ADR-005 AAD, purple UI, archive pointers |
| `SECURITY.md` | Security model | **update** | Private Letters title and letter terminology | Retitled LTG Vault; notes terminology; ADR-005/006 as active crypto ADRs |
| `AGENTS.md` | Agent rules | **update** | Pointed at archived TDR/ADRs; letters core rule | Rewritten for LTG Vault, notes domain, ADR-005/006, secure-auth boundary, archive note |

---

## Active `docs/` (source of truth and supporting)

| File | Current purpose | Status | Reason | Action taken |
|------|-----------------|--------|--------|--------------|
| `docs/README.md` | Documentation index | **keep** (created) | New index for active vs archive docs | Created with source-of-truth table and archive pointer |
| `docs/TDR_LTG_Vault_MVP.md` | Product/architecture direction | **keep** | Current TDR | Minor related-docs update; archive links for superseded TDR |
| `docs/LTG_VAULT_IMPLEMENTATION_PLAN.md` | Phased engineering plan | **update** | Phases 0–5 complete; historical phase tables mention letters | Marked complete; archive ADR links; exempt from doc guard (historical phase tables) |
| `docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md` | Vault crypto, note keys, recovery phrase | **keep** | Active ADR | No structural change |
| `docs/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md` | Passkey PRF vault unlock | **keep** | Active ADR | No structural change |
| `docs/LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md` | MVP acceptance traceability | **keep** | Active checklist | No change required |
| `docs/UI_UX_DIRECTION.md` | Purple LTG Vault UI direction | **keep** | Active UI spec | Navigation section updated (logged-in nav audit) |
| `docs/LOGGED_IN_NAVIGATION_AUDIT.md` | Logged-in nav structure | **keep** | Current nav audit | Created in nav pass; references notes/vault routes |
| `docs/PRIVATE_USABILITY_TEST_SCRIPT.md` | Usability test script | **keep** | Phase 5 deliverable | No change required |
| `docs/PASSKEY_LOGIN_VAULT_UNLOCK.md` | Passkey login vs vault unlock | **keep** | Integration boundary doc | No change required |
| `docs/AUTH_RESET_TO_SECURE_AUTH.md` | Auth boundary with secure-auth | **keep** | Defines package ownership | Updated notes terminology in preserved sections |
| `docs/MODULE_BOUNDARIES.md` | Module dependency rules | **update** | Letters module references | Rewritten for notes module; archive ADR-004 pointer |
| `docs/TESTING_STRATEGY.md` | Test layers and coverage | **keep** | Current testing approach | No E2E references as active |
| `docs/API_REFERENCE.md` | API overview | **update** | Letters API paths | Updated to `/api/notes` and vault routes |
| `docs/VERCEL_ENVIRONMENT_VARIABLES.md` | Deployment env vars | **update** | Product naming | LTG Vault naming alignment |
| `docs/BACKUP_RESTORE_POLICY.md` | Backup/restore policy | **update** | Letter table references | Notes/vault terminology |
| `docs/THREAT_MODEL_Private_Letters_Vault.md` | Threat model | **update** | Filename legacy; letter/ADR-001 refs | LTG Vault header banner; summary ADR-005; key control rows updated |
| `docs/LGPD_BETA_GATES.md` | Pre-beta compliance gates | **update** | Letters schema and ADR-001 | LTG Vault title; notes columns; ADR-005 |
| `docs/UTILITY_EXTRACTION_INVENTORY.md` | Utility extraction inventory | **update** | Letters utilities | Notes/crypto utilities |
| `docs/DOCUMENTATION_CLEANUP_AUDIT.md` | This audit | **keep** (created) | Required deliverable | Created |

---

## Archived `docs/archive/`

All archived files include header: *"Archived historical document. Not an active architecture/source-of-truth document."*

| File | Current purpose | Status | Reason | Action taken |
|------|-----------------|--------|--------|--------------|
| `docs/archive/README.md` | Archive index | **keep** (created) | Explains archive purpose | Created |
| `docs/archive/TDR_Private_Letters_Vault_MVP_Revised.md` | Old letters-first TDR | **archive** | Superseded by `TDR_LTG_Vault_MVP.md` | Moved with archive header |
| `docs/archive/adr/ADR-001_*` | Old payload/envelope ADR | **archive** | Superseded by ADR-005 | Moved with archive header |
| `docs/archive/adr/ADR-002_*` | Old vault unlock (recovery code, trusted device MVP) | **archive** | Superseded by ADR-005/006 | Moved with archive header |
| `docs/archive/adr/ADR-003_*` | Old API/schema ADR | **archive** | Superseded by TDR + ADR-005 | Moved with archive header |
| `docs/archive/adr/ADR-004_*` | Old modularization ADR | **archive** | Boundaries updated in `MODULE_BOUNDARIES.md` | Moved with archive header |
| `docs/archive/AUTH_PACKAGE_MIGRATION.md` | Completed secure-auth migration | **archive** | One-time migration complete | Moved with archive header |
| `docs/archive/LAYOUT_NAVIGATION_AUDIT.md` | Old nav audit | **archive** | Superseded by `LOGGED_IN_NAVIGATION_AUDIT.md` | Moved with archive header |
| `docs/archive/UI_UX_AUDIT.md` | Sage/green UI audit | **archive** | Superseded by `UI_UX_DIRECTION.md` | Moved with archive header |
| `docs/archive/UI_UX_IMPLEMENTATION_PLAN.md` | Sage/green UI plan | **archive** | Superseded by `UI_UX_DIRECTION.md` | Moved with archive header |
| `docs/archive/migrations/*` (5 files) | Secure-auth migration artifacts | **archive** | Phase 0 complete | Moved with archive header |

---

## Cursor / agent rules

| File | Current purpose | Status | Reason | Action taken |
|------|-----------------|--------|--------|--------------|
| `.cursor/rules/architecture.md` | Architecture rules for agents | **update** | Letters domain, old ADRs | Notes/vault, ADR-005/006, archive ADRs |
| `.cursor/rules/security.md` | Security rules | **update** | Letters plaintext rule | Notes metadata/content; secure-auth boundary |
| `.cursor/rules/crypto.md` | Crypto rules | **update** | ADR-001/002, PBKDF2, recovery code | Argon2id, recovery phrase, ADR-005/006 |
| `.cursor/rules/ui.md` | UI rules | **update** | Green envelope branding | Purple LTG Vault branding |
| `.cursor/rules/testing.md` | Testing rules | **update** | Letters E2E, old paths | Notes security tests; doc guard test reference |

---

## Module / package docs

| File | Current purpose | Status | Reason | Action taken |
|------|-----------------|--------|--------|--------------|
| `src/modules/README.md` | Module overview | **update** | Letters module | Notes module description |

---

## Deleted

No documentation files were deleted. Obsolete or misleading docs were **archived** under `docs/archive/` to preserve history without presenting them as active guidance.

---

## ADR classification

| ADR | Classification | Notes |
|-----|----------------|-------|
| ADR-001 — Cryptographic Payload Format | **archived** | Superseded by ADR-005 for LTG Vault KDF/envelopes; AAD concepts carried forward |
| ADR-002 — Vault Unlocking (recovery code, trusted device) | **archived** | Superseded by ADR-005 (recovery phrase) and ADR-006 (passkey PRF) |
| ADR-003 — API Contract / No Plaintext | **archived** | Principles live in TDR + active code; notes API replaces letters |
| ADR-004 — Modularization | **archived** | `MODULE_BOUNDARIES.md` reflects current state |
| ADR-005 — Argon2id, Recovery Phrase, Note Keys | **active** | Primary vault crypto ADR |
| ADR-006 — Passkey PRF Unlock | **active** | Passkey vault unlock ADR |

---

## Active “letters” reference audit

| Rule | Result |
|------|--------|
| No active `/letters` or `/api/letters` as current routes | **Pass** — only historical/archive/implementation-plan phase tables |
| No active `letters` table, service, or module | **Pass** — guard tests + doc guard |
| Content-type “letters, prayers, reflections, notes” allowed | **Pass** — product positioning in README/TDR |
| No instructions to preserve/migrate active letters code | **Pass** — AGENTS.md forbids reintroduction |

**Guard test:** `src/test/security/documentation-current-state.test.ts`

---

## Auth documentation cleanup

| Rule | Result |
|------|--------|
| Local auth not described as current | **Pass** — `AUTH_RESET_TO_SECURE_AUTH.md` + AGENTS.md |
| secure-auth owns account/login/OAuth/TOTP/sessions | **Pass** |
| LTG Vault owns vault decryption and encrypted notes | **Pass** |

---

## Broken links fixed

| Location | Fix |
|----------|-----|
| `README.md` | Links to `docs/archive/adr/` instead of removed `docs/ADR-001`–`004` |
| `ARCHITECTURE.md` | Removed links to archived UI/migration docs |
| `AGENTS.md` | Source-of-truth list points to ADR-005/006 and `docs/README.md` |
| `docs/TDR_LTG_Vault_MVP.md` | Archive pointers for old TDR and ADRs |
| `docs/LTG_VAULT_IMPLEMENTATION_PLAN.md` | Related docs → archive + ADR-005/006 |
| `docs/MODULE_BOUNDARIES.md` | ADR-004 archive path |
| `.cursor/rules/*.md` | Archive ADR paths |

Archived docs may still contain internal links to old `docs/ADR-*` paths — acceptable inside `docs/archive/`.

---

## Tests / guards added

| File | Purpose |
|------|---------|
| `src/test/security/documentation-current-state.test.ts` | Active docs must not describe removed letters routes/APIs, green branding, PBKDF2 vault KDF, or competing local auth as current |

---

## Validation (2026-06-16)

| Command | Result |
|---------|--------|
| `npm run lint` | **Pass** (0 errors, 4 pre-existing warnings) |
| `npm run test` | **Pass** — 692 tests, 156 files |
| `npm run test:coverage` | **Pass** — 90.65% statements (threshold 90%) |
| `npm run build` | **Pass** |

---

## Confirmations

- **No application behavior changed** for this documentation cleanup pass (nav/favicon work from parallel session is separate UI-only changes).
- **No auth, vault crypto, or database schema changes** as part of doc cleanup.
- **Active docs represent LTG Vault only** — letters domain is historical or content-type positioning only.

---

## Remaining documentation risks / TODOs

1. **`THREAT_MODEL_Private_Letters_Vault.md`** — filename retains “Private_Letters”; body partially updated. Deeper threat-scenario pass could replace remaining “letter” wording with “note” where implementation-specific.
2. **`docs/LTG_VAULT_IMPLEMENTATION_PLAN.md`** — historical phase tables still mention `/letters` and `src/modules/letters` as completed migration steps (intentionally exempt from doc guard).
3. **Legal docs** (`LGPD_BETA_GATES`, privacy policy) — engineering drafts; legal counsel sign-off still required before beta.
4. **`THREAT_MODEL`** recovery-code scenarios — some archived ADR-002 terminology may remain in threat scenarios; verify during external security review.
