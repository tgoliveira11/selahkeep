# LGPD and Privacy Beta Gates — LTG Vault MVP

## Document Status

| Field | Value |
|-------|-------|
| **Status** | Draft — P1 beta gate checklist |
| **Scope** | Brazil LGPD alignment and privacy prerequisites before real-user beta |
| **Related docs** | [TDR §37](./TDR_LTG_Vault_MVP.md), [THREAT_MODEL](./THREAT_MODEL_Private_Letters_Vault.md), [BACKUP_RESTORE_POLICY](./BACKUP_RESTORE_POLICY.md), [SECURITY.md](../SECURITY.md) |

## Purpose

This document lists **mandatory privacy and legal gates** before onboarding real users (public or private beta) for **LTG Vault**. Items marked **Required** block beta until completed or explicitly waived by legal counsel with documented risk acceptance.

The product targets users writing private spiritual content (letters, prayers, reflections, and notes). Data sensitivity is **high** even when note content is encrypted on the client — metadata, account identifiers, and availability of encrypted blobs still implicate LGPD.

---

## Beta Gate Summary

| Gate | Status | Blocks beta? |
|------|--------|--------------|
| Privacy / legal review | **Not started** | **Yes** |
| LGPD role and lawful basis documented | **Draft below** | **Yes** |
| Data residency decision | **Undecided** | **Yes** |
| Account deletion and retention documented | **Partial** — see below | **Yes** — legal sign-off |
| Privacy policy draft | **Not started** | **Yes** |
| Terms of use draft | **Not started** | Recommended |
| Age policy (18+) | **Default** — see below | **Yes** unless minors review |
| Threat model | [Draft](./THREAT_MODEL_Private_Letters_Vault.md) | **Yes** — external review |
| Backup / restore policy | [Draft](./BACKUP_RESTORE_POLICY.md) | **Yes** — verification |
| Incident response plan | **Not started** | **Yes** |
| External security review plan | **Not started** | **Yes** |

---

## 1. Privacy and Legal Review (Required)

**Requirement:** Engage qualified privacy/legal counsel familiar with LGPD before any beta involving real users.

**Review must cover:**

- Lawful basis for processing (contract, consent, legitimate interest analysis)
- Data controller vs. processor roles (hosting vendors: Vercel, PostgreSQL provider, OAuth providers)
- International data transfer mechanisms if data leaves Brazil
- Data subject rights workflow (access, correction, deletion, portability)
- Breach notification obligations (ANPD, users, timelines)
- Marketing and communication compliance
- Religious/sensitive content considerations in disclosures
- Alignment between technical behavior and privacy policy claims

**Deliverable:** Written legal memo or checklist sign-off dated before beta launch.

**Current state:** Not completed. Engineering documentation (this file, threat model, backup policy) is input to legal review — not a substitute.

---

## 2. LGPD Considerations

### 2.1 Data categories processed

| Category | Examples | Encrypted? | LGPD relevance |
|----------|----------|------------|----------------|
| Account data | Email, auth provider, password hash | Password hashed | Identification |
| Account 2FA | Encrypted TOTP secret, hashed backup codes | TOTP secret encrypted (`tf-v1`); backup codes hashed | Sign-in security — not note decryption |
| Encrypted note content | `encrypted_title`, `encrypted_body`, `encrypted_categories`, `encrypted_tags` | Yes (client-side) | Potentially sensitive personal content |
| Cryptographic envelopes | Vault envelopes, note keys (wrapped) | Yes | Security — not readable by operator |
| Metadata | Timestamps, answered status (encrypted), device names | Partially encrypted | Profiling surface limited but present |
| Audit / security logs | Login, unlock failures, device revoke | Sanitized — no note content | Legitimate interest / security |
| OAuth tokens | Managed by NextAuth / providers | Provider-dependent | Third-party processing |

**Key message for LGPD analysis:** The operator is designed **not** to have access to decryption keys for private note content. This reduces but does not eliminate LGPD obligations — personal data and metadata remain.

### 2.2 Likely data subject rights

| Right (LGPD Art. 18) | MVP support | Notes |
|----------------------|-------------|-------|
| Confirmation / access | **Partial** | User can view own notes when vault unlocked; export not implemented |
| Correction | **Partial** | User can edit notes in app |
| Anonymization / deletion | **Partial** | Account deletion cascades active user data |
| Portability | **Not implemented** | No encrypted export format in MVP |
| Information about sharing | **Required in policy** | Document OAuth and hosting subprocessors |
| Revocation of consent | **Via account deletion** | No separate marketing consent layer in MVP |

**Gap:** Portability and formal DSAR (data subject access request) process require legal-defined workflow before beta.

### 2.3 Security measures (LGPD Art. 46)

Document for legal review:

- Client-side encryption before transmission (AES-GCM, ADR-005)
- No plaintext private notes on server
- Rate limiting with PostgreSQL adapter in production (`RATE_LIMIT_STORE=postgres`)
- Audit logs without sensitive content
- Vault auto-lock after 15 minutes of inactivity
- Trusted device revocation with documented offline limitation
- Plaintext rejection, sentinel tests, and CI security gates
- Autosave **disabled** for MVP — no background plaintext persistence
- Optional account TOTP 2FA (sign-in only; does not decrypt notes); backup codes shown once and stored hashed

### 2.4 Data Protection Officer (DPO)

**Action:** Legal to determine if DPO appointment is required and publish contact channel in privacy policy.

### 2.5 Records of processing (ROPA)

**Action:** Legal + product to maintain ROPA describing purposes, categories, recipients, retention, and transfers.

### 2.6 DPIA / RIPD

**Recommendation:** Conduct a Data Protection Impact Assessment (Relatório de Impacto à Proteção de Dados) given sensitive spiritual/personal content — even with encryption.

---

## 3. Data Residency Decision (Required)

**Requirement:** Decide and document primary hosting region for:

- PostgreSQL database (application data)
- Next.js application (Vercel or equivalent)
- Logs and error tracking (if enabled)
- Backup / snapshot storage region

**Options to evaluate with legal:**

| Option | Pros | Cons |
|--------|------|------|
| Brazil-only hosting | Strongest LGPD narrative for local users | Fewer managed options; cost |
| US/EU provider with SCCs | Mature providers (Neon, Supabase, Vercel) | Cross-border transfer analysis required |
| Multi-region DR | Higher availability | Data location complexity |

**Current state:** Undecided. TDR notes low-cost providers for development; paid tiers with clearer guarantees recommended before meaningful production use.

**Deliverable:** ADR or appendix stating chosen regions, subprocessors, and transfer mechanism — **before beta**.

---

## 4. Account Deletion and Retention (Documented)

### 4.1 Active storage behavior (implemented)

When a user requests account deletion (`DELETE /api/account` or `/settings/account` UI):

| Data | Action |
|------|--------|
| User profile | Deleted |
| Encrypted letters | Cascade deleted |
| Vault and envelopes | Cascade deleted |
| Trusted devices | Cascade deleted |
| Passkey credentials | Cascade deleted |
| WebAuthn challenges | Cascade deleted |
| Audit events | Retained with `userId` set to null |

Note deletion (`DELETE /api/notes/:id`) soft-deletes encrypted note rows (`deleted_at`); account deletion cascades vault and notes.

Rate limiting applies to account deletion attempts. Deletion is audited as `account_deletion_requested` without sensitive metadata.

**Account verification and password emails:** transactional messages (email verification, password reset) contain account links only — never private letter title/body or vault keys. Tokens are stored hashed server-side; privacy policy must disclose email processing and retention of `account_tokens` metadata.

**Account sessions:** stores coarse device metadata and masked IP for session list; full IP hashed; disclose in privacy policy; distinct from trusted-device vault data.

### 4.2 Retention after deletion

| Data type | Retention | Content |
|-----------|-----------|---------|
| Active DB user content | Removed on deletion | Encrypted letters and keys gone |
| Audit events | **TBD** — period to be set by legal | Event type, timestamp, non-sensitive metadata only |
| Backups | **TBD** — see [BACKUP_RESTORE_POLICY](./BACKUP_RESTORE_POLICY.md) | Encrypted snapshots may persist until expiry |
| Logs | **TBD** | Must not contain letter plaintext |

**Critical:** Do **not** promise immediate deletion from all backups until verified with provider and documented in privacy policy.

### 4.3 Legal deliverable

Privacy policy must describe:

- What is deleted immediately from active systems
- What may persist temporarily (backups, audit, logs)
- How to request deletion (in-app account deletion + support contact)
- That encrypted content cannot be read by the operator after deletion

---

## 5. Privacy Policy Draft (Required)

**Requirement:** Publish a privacy policy draft before beta. Engineering constraints that **must** be accurately reflected:

### Must disclose

1. **Client-side encryption model** — letters encrypted on device before save; operator does not hold decryption keys for letter content.
2. **Recovery responsibility** — if user loses recovery code and all devices, letters cannot be recovered by support.
3. **Metadata collected** — email, auth method, letter dates, answered status, device labels, security audit events.
4. **Subprocessors** — hosting, database, OAuth (Google, Apple, Microsoft), email delivery if used.
5. **Data location** — once residency decision is made.
6. **Retention and deletion** — active deletion vs. backup lag per [BACKUP_RESTORE_POLICY](./BACKUP_RESTORE_POLICY.md).
7. **Security measures** — high-level: encryption, auto-lock, device management; no false guarantees against malware or phishing.
8. **Children** — 18+ policy (see §6).
9. **Contact** — DPO or privacy contact channel.
10. **LGPD rights** — how Brazilian users exercise Art. 18 rights.

### Must not claim (until verified)

- "We cannot see anything about your letters" — metadata is visible.
- "Deletion is instant from all systems including backups."
- "Protection against all malware, extensions, or phishing."
- AI processing of private letters — **none** in MVP.

**Deliverable:** Legal-reviewed privacy policy URL or draft document linked from app footer and signup.

---

## 6. Age Policy (Required)

**Default MVP policy:** **18 years or older only.**

Rationale:

- Content is private spiritual/personal writing with high sensitivity.
- Minors require additional LGPD protections (Art. 14), parental consent, and safety review.
- TDR §37: MVP should be 18+ unless dedicated minors/privacy/safety review is completed.

**If minors are desired in future:**

- Separate legal review for child consent and best interests
- Age verification mechanism
- Enhanced safety and reporting workflows
- Potential design changes to recovery and account flows

**Beta gate:** App signup and terms must state 18+ requirement. **Do not onboard minors until waiver review is complete.**

---

## 7. Additional Pre-Beta Gates (TDR §37)

| Item | Description | Status |
|------|-------------|--------|
| Terms of use | Acceptable use, account rules, limitation of liability | Draft needed |
| Incident response | Breach detection, ANPD notification, user communication | Not started |
| Production monitoring | Uptime, backup failure alerts, log redaction validation | Not started |
| Log redaction validation | Prove sentinel/content absent from production logs | Planned |
| External security review | Crypto implementation, threat model validation | Planned |
| Analytics | Disabled on private letter screens | Required at deploy config |
| Staging isolation | Separate DB, OAuth credentials, secrets | Required |

---

## 8. Technical Facts for Legal and Policy Authors

Reference table for consistent messaging:

| Topic | Fact |
|-------|------|
| Letter encryption | Client-side AES-GCM before API; server stores ciphertext only |
| Operator access to letters | No server-side decryption path by design |
| Authentication | Google, Apple, Microsoft, email/password; passkeys for vault unlock |
| Session vs. vault | Login ≠ vault unlock; keys required on each device |
| Auto-lock | 15 minutes inactivity |
| Autosave | Disabled in MVP |
| Account deletion | Cascades user-owned application data in active DB |
| Audit logs | Security events only; sanitized metadata |
| Rate limiting | Production: `RATE_LIMIT_STORE=postgres` |
| Offline revocation | Revoked device may work offline until next online check — disclose as residual risk |
| AI | No AI processing of private letter content |
| Community sharing | Out of scope — no anonymous export in MVP |

---

## 9. Checklist Before Real-User Beta

Use this checklist in launch review:

- [ ] Legal / privacy counsel engaged and sign-off recorded
- [ ] LGPD lawful basis and ROPA documented
- [ ] Data residency decision recorded with subprocessor list
- [ ] Privacy policy published and linked in app
- [ ] Terms of use published (recommended)
- [ ] Age gate (18+) in signup flow and policy
- [ ] Account deletion flow tested end-to-end
- [ ] Deletion / backup language reviewed against [BACKUP_RESTORE_POLICY](./BACKUP_RESTORE_POLICY.md)
- [ ] [THREAT_MODEL](./THREAT_MODEL_Private_Letters_Vault.md) reviewed externally
- [ ] Incident response plan approved
- [ ] Production `RATE_LIMIT_STORE=postgres` confirmed
- [ ] Analytics / session replay disabled on vault routes
- [ ] DPO / privacy contact published (if required)
- [ ] DSAR process defined (even if manual email workflow)

---

## Revision History

| Version | Date | Change |
|---------|------|--------|
| 0.1 (draft) | 2026-06-10 | Initial P1 beta gate checklist |
