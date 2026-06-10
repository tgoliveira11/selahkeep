# Backup and Restore Policy — Private Letters Vault MVP

## Document Status

| Field | Value |
|-------|-------|
| **Status** | Draft — P1 beta gate |
| **Scope** | PostgreSQL active storage and provider-managed backups |
| **Related docs** | [TDR §23–24](./TDR_Private_Letters_Vault_MVP_Revised.md), [THREAT_MODEL](./THREAT_MODEL_Private_Letters_Vault.md), [LGPD_BETA_GATES](./LGPD_BETA_GATES.md) |

## Purpose

This document defines the **current** backup and restore posture for the Private Letters Vault MVP. It is a draft policy required before onboarding real users beyond internal testing. It does **not** constitute a production SLA until verified with the chosen hosting provider and signed off by operations and legal.

---

## Design Principles

1. **Encryption before upload:** Private letter title and body are encrypted on the client. The server and any faithful database copy store ciphertext only.
2. **No plaintext in backups:** Backups must never contain plaintext private letter content or key material. If backups exist, they mirror encrypted active storage.
3. **Honest deletion claims:** Account and letter deletion remove data from **active** application storage. Propagation to all backup tiers is **not yet verified** — do not promise immediate erasure from historical snapshots.
4. **Recovery is operational, not cryptographic:** Restoring a database backup recovers encrypted blobs; users still require vault unlock methods to read letters.

---

## Current Backup Approach

### Local development

| Aspect | Current state |
|--------|---------------|
| Database | Docker Compose PostgreSQL 16 (`docker-compose.yml`) |
| Persistence | Named volume `postgres_data` on developer machine |
| Formal backup | **None** — developers are responsible for local data |
| Encryption at rest | Depends on host disk encryption only |

Local development is not backed up by the project. Data loss on volume deletion is acceptable for dev workflows.

### Staging and production (planned)

Per TDR, early deployments may use managed PostgreSQL (e.g., Neon, Supabase) and Next.js hosting (e.g., Vercel). **A production backup strategy is not finalized in the MVP codebase.**

Expected provider-managed capabilities (to be confirmed per vendor):

| Capability | Expectation |
|------------|-------------|
| Automated snapshots | Daily or continuous PITR — vendor default |
| Snapshot encryption | Provider-managed encryption at rest |
| Snapshot access | Restricted to operations roles |
| Cross-region replication | Not assumed unless explicitly configured |

**Current posture:** rely on provider-default database backups where enabled; no application-level encrypted export pipeline exists.

### Application-level backups

The MVP does **not** implement:

- User-initiated encrypted backup export
- Cross-region application-managed backup vault
- Backup deletion orchestration tied to account deletion events

These are out of scope for MVP finalization (TDR non-goals §4).

---

## Backup Content: Encrypted Private Letters Only

When database backups exist, they contain:

| Included | Encrypted? | Notes |
|----------|------------|-------|
| `letters.encrypted_title` | Yes (AES-GCM) | Ciphertext + metadata |
| `letters.encrypted_body` | Yes (AES-GCM) | Ciphertext + metadata |
| `letters.encrypted_letter_key` | Yes | Wrapped by User Vault Key |
| `vault_envelopes.encrypted_vault_key` | Yes | Trusted device, passkey, recovery envelopes |
| `vault_envelopes.kdf_metadata` | N/A | Public KDF parameters for recovery envelopes |
| `users.email` | No | Account identifier — metadata |
| `letters.answered` | No | Open metadata per MVP decision |
| Audit events | No sensitive content | Sanitized metadata only |

**Invariant:** Plaintext private letter title/body must never be written to active storage or backups. Sentinel and plaintext-rejection tests enforce this on the application path.

**What backups do not contain:**

- Plaintext User Vault Key, Letter Key, or recovery code
- Decrypted letter content
- Non-extractable device `CryptoKey` (browser-only)

---

## Retention Expectations

| Tier | Draft expectation | Status |
|------|-------------------|--------|
| Active database | Life of account + operational need | Implemented |
| Provider snapshots | **TBD** — align with vendor default (often 7–30 days) | **Not verified** |
| Audit events | Retained after user deletion (`userId` set null on cascade) | Implemented; retention period **TBD** |
| Application logs | **TBD** — minimize and redact | Policy required |
| Local dev volumes | Until developer deletes | N/A |

**Before production beta:** document exact snapshot retention, PITR window, and log retention with the chosen provider and legal counsel.

---

## Deletion Propagation Expectations

### Active storage (implemented)

| User action | Active storage behavior |
|-------------|-------------------------|
| Delete letter | Physical delete of encrypted letter row and keys (`letter_deleted` audit event) |
| Delete account | `DELETE /api/account` cascades via FK: letters, vaults, envelopes, trusted devices, passkeys, webauthn challenges |
| Audit events on account delete | `userId` set to null — event type/timestamp retained without letter content |

Account deletion removes user-owned encrypted content from the **live** database.

### Backups and replicas (not yet guaranteed)

| Expectation | Current status |
|-------------|----------------|
| Immediate purge from all historical snapshots | **Not promised** |
| Snapshot expiry removes deleted user data | **Assumed** per provider retention — **not verified** |
| Manual backup purge on deletion request | **Not implemented** |
| Cross-region replica lag handling | **Not assessed** |

**User-facing language (draft):**  
> When you delete your account, your encrypted letters and vault data are removed from our active systems. Copies in disaster-recovery backups may persist until those backups expire according to our retention schedule. We do not use backup copies to restore your account unless you request a supported restore during a documented incident.

This wording must be reviewed by legal before publication.

---

## Restore Testing Plan

Restore drills are **required before production beta** but **not yet executed**. Planned procedure:

### Phase 1 — Documentation (pre-beta)

1. Identify production PostgreSQL provider and backup features enabled.
2. Record snapshot frequency, retention window, PITR granularity, and encryption settings.
3. Document who may initiate restore (operations role, break-glass).

### Phase 2 — Staging drill (pre-beta gate)

| Step | Action | Success criteria |
|------|--------|------------------|
| 1 | Provision staging DB with production-like schema | Migrations apply cleanly |
| 2 | Seed with fake encrypted payloads only (no real user data) | Sentinel phrase absent |
| 3 | Take manual or wait for automated snapshot | Snapshot ID recorded |
| 4 | Simulate data loss (drop/recreate database or destructive migration) | Active data gone |
| 5 | Restore from snapshot / PITR | Schema and rows recovered |
| 6 | Verify application starts; user can authenticate | Health check passes |
| 7 | Verify vault unlock still requires client keys | Ciphertext present; no server decrypt |
| 8 | Record RTO/RPO observed | Documented in runbook |

### Phase 3 — Production readiness (post-beta planning)

- Annual or quarterly restore drill on staging clone.
- Alerting on backup job failures.
- Runbook linked from incident response plan.

**Owner:** Operations (TBD). **Target:** complete Phase 2 before first real-user beta.

---

## Limitations Before Production

The following limitations apply until this policy is finalized and verified:

| Limitation | Detail |
|------------|--------|
| No custom backup encryption layer | Relies on DB ciphertext + provider at-rest encryption |
| No user-exportable backup | Users cannot download an encrypted archive in MVP |
| No backup-deletion API | Account deletion does not trigger per-snapshot purge |
| No tested RTO/RPO | Recovery time objectives undocumented |
| Free-tier provider gaps | TDR warns free tiers may lack reliable backup guarantees |
| Single-region default | Data residency and cross-border replication undecided — see [LGPD_BETA_GATES.md](./LGPD_BETA_GATES.md) |
| Audit retention undefined | Post-deletion audit rows may persist for unspecified period |

---

## What We Cannot Promise Yet

Do **not** communicate the following to users until verified and legal-approved:

1. **Immediate deletion from all backups** upon account or letter deletion.
2. **Zero residual data** in any provider system after deletion.
3. **Specific RPO/RTO** (e.g., "less than 1 hour data loss") without provider contract evidence.
4. **Geographic backup location** until data residency decision is made.
5. **Operator-assisted letter recovery** from backups without user vault keys — cryptographically impossible by design.
6. **Backup-bound encryption key rotation** — key rotation strategy is post-MVP (TDR §25).

---

## Incident Scenarios

| Scenario | Expected response |
|----------|-------------------|
| Database corruption | Restore from latest clean snapshot; assess data loss window |
| Ransomware on provider | Use provider snapshot / PITR; rotate credentials |
| Accidental account deletion | **No plaintext recovery path**; encrypted backups do not help without user keys |
| Backup leak | Treat as [database leak](./THREAT_MODEL_Private_Letters_Vault.md#1-database-leak) + [backup exposure](./THREAT_MODEL_Private_Letters_Vault.md#12-backup-exposure); rotate credentials; notify per LGPD/incident plan |
| User requests all copies erased | Document provider ticket process; honest timeline based on retention |

---

## Action Items Before Real-User Beta

| # | Action | Owner |
|---|--------|-------|
| 1 | Select production PostgreSQL provider and enable backups/PITR | Operations |
| 2 | Record retention settings in this document (replace TBD) | Operations |
| 3 | Execute staging restore drill (Phase 2) | Engineering + Operations |
| 4 | Align privacy policy deletion language with verified retention | Legal |
| 5 | Move off free-tier infra if backup SLAs insufficient | Product + Operations |
| 6 | Link backup incidents to incident response plan | Security |

---

## Revision History

| Version | Date | Change |
|---------|------|--------|
| 0.1 (draft) | 2026-06-10 | Initial P1 beta gate policy |
