> **Archived historical document.** Not an active architecture or source-of-truth document.
> Current source of truth: `docs/TDR_LTG_Vault_MVP.md`, `docs/ADR-005_*`, `docs/ADR-006_*`.


# TDR — Private Letters Vault MVP

## 1. Document Status

**Status:** Final MVP Technical Design Record — Revised after architecture, security, development, data, operations, product, and AI-agent review  
**Product Area:** Private Letters / Secure Spiritual Journal  
**Primary Platform:** Web-first responsive application  
**Primary Stack:** Next.js + PostgreSQL  
**Architecture Style:** API-first application boundary  
**Native Apps:** Out of scope for MVP  
**Blockchain:** Out of scope for MVP  
**Community Features:** Out of scope for this first MVP layer  
**Primary Security Goal:** Private letters must be encrypted on the user’s device before being stored.  
**Required ADRs before implementation:** ADR-001, ADR-002, ADR-003.

---

## 2. Product Context

The product allows people to write private digital “letters to God.”

The core metaphor is that the platform acts as a “mail carrier”: it helps users write, preserve, and eventually share anonymized letters for prayer support from a Christian community.

However, the first and most important problem to solve is not the community layer. The first problem is trust.

Users must be able to write highly personal letters with confidence that:

- their private letters are not readable by administrators;
- their private letters are not readable by support staff;
- their private letters are not readable directly from the database;
- their private letters are not sent to AI systems;
- their private letters are not exposed through analytics, logs, monitoring tools, admin panels, or session replay tools.

The MVP must therefore implement a private encrypted vault for personal letters.

The long-term product vision may include anonymous sharing and community prayer, but this MVP focuses only on the private encrypted letter vault.

---

## 3. MVP Objective

The MVP must allow users to:

1. Create an account.
2. Sign in using Google, Apple, or email/password.
3. Create private letters.
4. View their own private letters.
5. Edit their own private letters.
6. Delete their own private letters from active storage.
7. Mark letters as answered.
8. Recover access to encrypted letters using available recovery methods.
9. Manage trusted devices.
10. Use the product from a responsive web interface.
11. Use passkeys from the beginning of the MVP, subject to the reviewed vault-unlocking model.
12. Store all private letter title/body content encrypted in the database.
13. Keep frontend, API, service, repository, and database boundaries explicit.
14. Prevent agents or developers from weakening the privacy promise through shortcuts.

The system must ensure that private letter title and body are encrypted on the client before being sent to the backend.

---

## 4. Non-Goals

The MVP will not include:

1. Blockchain.
2. Native iOS or Android apps.
3. Community feed.
4. Public anonymous letters.
5. “I prayed for you” community interaction.
6. Comments.
7. Private messaging between users.
8. Human responses to letters.
9. AI-generated responses.
10. AI reading private letters.
11. AI moderation of private letters.
12. Moderation of private letters.
13. Social recovery through guardians.
14. Key rotation implementation.
15. Full encrypted backup strategy.
16. Backup deletion propagation policy.
17. Public profiles.
18. Rankings, badges, reputation, or spiritual gamification.
19. Server Actions for private letter persistence.
20. Direct frontend-to-database access.
21. Plaintext autosave.

Future community sharing must use a separate anonymized and moderated copy of the letter, never the original private encrypted letter.

---

## 5. Core Product Principles

### 5.1 Privacy by Design

Private letters must be encrypted before leaving the user’s device.

The backend must store only encrypted content.

The application must not possess enough information to decrypt private letters on its own.

### 5.2 Social Login Is Identity, Not Decryption

Social login providers such as Google or Apple may authenticate the user’s identity.

Authentication alone must not be sufficient to decrypt letters.

Identity and vault access are separate concepts.

### 5.3 No Admin Access to Private Letters

No administrator, support agent, developer, database operator, or internal dashboard should be able to read private letter content.

Admin tools may show operational metadata, but never decrypted letter content.

### 5.4 Recovery Without Breaking Privacy

The user must be able to recover access through available recovery mechanisms.

However, the platform must not create a hidden administrative recovery path that allows the company to decrypt private letters.

If the user loses all trusted devices, passkeys, and recovery codes, the platform must not be able to recover the private letters.

### 5.5 Low-Friction User Experience

The product must not expose technical cryptography concepts to normal users.

Users should not need to understand:

- vault keys;
- letter keys;
- AES-GCM;
- WebCrypto;
- passkeys;
- envelope encryption;
- recovery envelopes;
- key derivation functions.

The interface should use simple, human language.

Recommended privacy copy:

> “Your private letters are protected on your device before they are saved. Our systems are designed so our team does not have access to the keys required to read them.”

### 5.6 No Social-Network Dynamics in the First Layer

The private vault must not become a social feed.

The first product layer is a private encrypted spiritual journal, not a public community, discussion board, or prayer social network.

### 5.7 Honest Security Boundaries

The system cannot protect plaintext while it is displayed in a compromised browser, malicious browser extension, screen recorder, malware-infected device, or compromised operating system.

This limitation must be part of the internal threat model and, where appropriate, user-facing privacy documentation.

---

## 6. Required Architecture Layers

The MVP must use explicit layers:

```text
UI Layer
  -> Crypto Client Layer
  -> API Client Layer
  -> API Route Layer
  -> Service Layer
  -> Repository Layer
  -> Database Layer
```

Only the **Crypto Client Layer** may handle plaintext private letter title/body, and only while the user is actively writing or reading.

The backend, repository layer, database, logs, analytics, and admin tooling must never handle plaintext private letter title/body.

---

## 7. Key Concepts

### 7.1 User Vault

Each user has a logical private vault.

The vault contains encrypted letters and cryptographic metadata required to decrypt them on authorized devices.

### 7.2 User Vault Key

Each user has a **User Vault Key**.

The User Vault Key is responsible for protecting the keys used by individual letters.

The User Vault Key must be:

- generated on the client;
- random;
- strong;
- never sent to the backend in plaintext;
- never stored in the database in plaintext;
- protected through reviewed vault envelopes.

### 7.3 Letter Key

Each letter should have its own **Letter Key**.

The Letter Key encrypts the body and title of a single letter.

The Letter Key is encrypted by the User Vault Key.

Conceptual model:

```text
Letter title/body
  encrypted by Letter Key

Letter Key
  encrypted by User Vault Key

User Vault Key
  unlocked by trusted device, passkey, or recovery code
```

### 7.4 Envelope Encryption

The MVP must use envelope encryption.

```text
Letter content
  -> encrypted with a Letter Key

Letter Key
  -> encrypted with the User Vault Key

User Vault Key
  -> protected by trusted device, passkey, and/or recovery code
```

See **ADR-001** for the required cryptographic payload format.

---

## 8. Cryptographic Specification Requirement

The cryptographic implementation must follow **ADR-001 — Cryptographic Payload Format and Envelope Encryption**.

At minimum, the MVP must define and implement:

- algorithm;
- key sizes;
- IV/nonce generation;
- associated authenticated data;
- structured encrypted payload format;
- recovery-code KDF;
- KDF parameter versioning;
- encryption versioning;
- failure handling;
- tests that detect plaintext leakage.

Any deviation from ADR-001 requires explicit security review.

---

## 9. Vault Unlocking Requirement

Passkeys, trusted devices, and recovery codes must follow **ADR-002 — Vault Unlocking, Passkeys, Trusted Devices, and Recovery Code**.

Important rule:

> Passkeys must not be assumed to directly encrypt or decrypt the User Vault Key unless the implementation uses a reviewed and supported key-wrapping design.

For the MVP, passkeys may be used to authorize access to a locally stored encrypted vault envelope, but the exact mechanism must follow ADR-002.

---

## 10. Authentication

The MVP must support:

1. Google login.
2. Apple login.
3. Email/password login.

Authentication proves who the user is.

Authentication does not, by itself, decrypt the user’s letters.

After login, the client must still unlock or recover the User Vault Key before letters can be decrypted.

---

## 11. Platform Strategy

The MVP is **web-first responsive**.

The first version must work well on:

- desktop browsers;
- mobile browsers;
- tablets;
- responsive layouts.

Native mobile apps are out of scope for the MVP.

The architecture should not prevent future native apps from using stronger native security capabilities such as:

- iOS Keychain;
- Secure Enclave;
- Android Keystore.

---

## 12. Proposed Technology Stack

### 12.1 Frontend

The MVP should use:

- Next.js;
- TypeScript;
- React;
- responsive UI;
- browser-based cryptography;
- passkey/WebAuthn support;
- frontend API client layer.

The frontend is responsible for encryption and decryption of private letters.

### 12.2 Backend/API

The MVP should expose explicit API endpoints.

The frontend must consume the application through API calls.

The frontend must not directly read from or write to the database.

The API layer is responsible for:

- authentication session validation;
- authorization;
- rate limiting;
- storing encrypted payloads;
- returning encrypted payloads;
- managing trusted devices;
- managing vault envelopes;
- managing recovery metadata;
- enforcing deletion rules;
- preventing plaintext private letter content from being accepted or returned.

### 12.3 Database

The recommended relational database for the MVP is **PostgreSQL**.

SQLite may be used only for local prototyping or isolated development tests, if explicitly marked as non-production.

### 12.4 ORM / Query Builder

Recommended options:

- Prisma;
- Drizzle;
- Kysely.

Preferred private letter model naming:

```text
encrypted_title
encrypted_body
encrypted_letter_key
encryption_version
```

Avoid ambiguous plaintext names such as:

```text
title
body
content
text
message
```

unless clearly unrelated to private encrypted letters.

---

## 13. API-First Application Boundary

The application must follow an API-first boundary between frontend and backend.

Even if Next.js is used as the full-stack framework, the frontend must consume application APIs rather than directly reading or writing database records.

This means:

- React components must not import database clients directly.
- Client components must not call ORM/database functions.
- UI code must not bypass the API layer.
- Server Actions are not allowed for private letter persistence in the MVP.
- All private letter persistence must go through explicit API contracts.

The API must treat encrypted letter content as opaque ciphertext.

The API must not know how to decrypt private letter title or body.

See **ADR-003 — API Contract, Database Schema, and No-Plaintext Enforcement**.

---

## 14. Next.js Architecture Decision

Recommended structure:

```text
/src
  /app
    /(public)
    /(auth)
    /(vault)
    /api
  /components
  /features
    /letters
    /vault
    /trusted-devices
    /recovery
    /auth
  /lib
    /crypto-client
    /api-client
    /validation
    /auth
    /db
  /server
    /repositories
    /services
    /policies
```

### 14.1 Client-Side Responsibilities

The client-side code is responsible for:

- generating the User Vault Key;
- generating Letter Keys;
- encrypting private letter title and body;
- decrypting private letter title and body;
- handling recovery code input locally;
- interacting with passkeys according to ADR-002;
- sending only encrypted payloads to the API.

### 14.2 API/Server Responsibilities

The API/server code is responsible for:

- validating authenticated sessions;
- checking resource ownership;
- enforcing multi-tenant authorization;
- enforcing rate limits;
- storing encrypted letter records;
- returning encrypted letter records;
- managing trusted devices;
- managing vault envelopes;
- storing open metadata;
- enforcing deletion;
- preventing plaintext content from entering logs or database storage.

### 14.3 Database Responsibilities

The database stores:

- users;
- vault metadata;
- encrypted vault envelopes;
- trusted device records;
- encrypted letters;
- open answered status;
- timestamps;
- operational metadata.

The database must not store plaintext letter title or plaintext letter body.

---

## 15. Browser Support Model

The MVP must support client-side encryption in the browser.

The User Vault Key must not be stored directly in localStorage.

Recommended local storage approaches:

- encrypted key material in IndexedDB;
- session memory for short-lived unlocked state;
- passkey/WebAuthn-authorized vault unlocking;
- encrypted vault envelopes.

Private letter plaintext must not be persisted in:

- localStorage;
- sessionStorage;
- cookies;
- URL parameters;
- query strings;
- client-side logs;
- analytics payloads;
- session replay tools.

Autosave is allowed only if it encrypts content client-side before persistence. Plaintext autosave is forbidden.

---

## 16. Security Risks Specific to Browser

Because the browser executes JavaScript delivered by the application, frontend integrity is critical.

Required mitigations:

1. HTTPS only.
2. Strong Content Security Policy.
3. No third-party scripts on letter-writing or letter-reading pages.
4. No session replay on private letter pages.
5. No analytics capturing text inputs.
6. Strict XSS prevention.
7. Sanitization for all rendered user-controlled content.
8. Dependency scanning.
9. Code review required for cryptographic flows.
10. Deployment approvals for frontend changes touching vault or letter screens.
11. Error tracking must strip request/response payloads.
12. Sensitive screens must be isolated from marketing/public scripts.

Suggested CSP baseline for private vault pages:

```text
default-src 'self';
script-src 'self';
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

---

## 17. Letter Data Requirements

### 17.1 Letter Title

The letter title is technically required in the data model.

However, it is optional for the user.

If the user does not provide a title, the client must generate a safe default title that does not compromise privacy.

Example:

```text
Letter from June 10, 2026 at 14:32
```

The generated title must not be based on letter content.

The title must be encrypted.

### 17.2 Letter Body

The letter body must be encrypted on the client before being sent to the backend.

The backend must never receive the private letter body in plaintext.

### 17.3 Answered Status

The “answered” status will be stored as open metadata.

Decision:

> The answered status is not encrypted in the MVP.

The system may store:

```text
answered: true | false
answered_at: timestamp | null
```

UI wording should avoid asserting that the platform knows God answered the letter. Preferred wording:

- “Mark as answered”
- “I believe this was answered”
- “Mark as answered in my journey”

### 17.4 Private Notes or Testimony

Any future private note, testimony, or reflection associated with the letter must be encrypted.

### 17.5 MVP Size Limits

Initial configurable MVP limits:

```text
title plaintext max: 200 characters before encryption
body plaintext max: 20,000 characters before encryption
trusted devices per user: configurable; default 50
letters per user: configurable
```

Although trusted devices are conceptually unlimited from a product perspective, the system must enforce a configurable safety limit.

---

## 18. User Flows

### 18.1 First Sign-In

1. User signs in with Google, Apple, or email/password.
2. System creates user account if needed.
3. Client initializes the user vault if it does not exist.
4. Client generates the User Vault Key.
5. User may begin writing the first letter.

### 18.2 Create Letter

1. User opens the “Write Letter” page.
2. User enters optional title.
3. If title is empty, client generates a default title based only on date/time.
4. User writes the letter body.
5. Client generates a Letter Key.
6. Client encrypts title and body with the Letter Key.
7. Client encrypts the Letter Key with the User Vault Key.
8. Backend receives encrypted title, encrypted body, encrypted Letter Key, and non-sensitive metadata.
9. Backend stores the encrypted record.

The backend must never receive plaintext title or plaintext body.

### 18.3 View Letter

1. User opens the letter list.
2. Backend returns encrypted letters and open metadata.
3. Client unlocks the User Vault Key.
4. Client decrypts the Letter Key.
5. Client decrypts title and body locally.
6. User reads the letter.

### 18.4 Edit Letter

1. User opens an existing letter.
2. Client decrypts the letter locally.
3. User edits title and/or body.
4. Client re-encrypts updated content.
5. Backend stores updated ciphertext.

### 18.5 Mark as Answered

1. User marks a letter as answered.
2. Backend updates open metadata:

```text
answered = true
answered_at = current timestamp
```

The encrypted letter content remains unchanged.

### 18.6 Delete Letter

The user must be able to permanently delete a letter from active storage.

Deletion must remove:

- encrypted letter title;
- encrypted letter body;
- encrypted Letter Key;
- associated private encrypted note, if any;
- related application-level metadata tied only to that letter.

For letters, the MVP should prefer physical deletion over soft deletion.

The `deleted_at` column should be omitted from the `letters` table unless a short-lived deletion workflow is explicitly implemented and tested.

---

## 19. Recovery Strategy

The MVP must support multiple recovery or unlock methods.

Available methods in MVP:

1. Trusted device.
2. Passkey.
3. Recovery code.

The system must clearly indicate whether the user’s vault is safely recoverable or at risk.

### 19.1 Vault Recovery State

The UI should expose a recovery state:

```text
Protected: at least two recovery methods configured
Basic: only the current trusted device configured
At Risk: no durable recovery method configured
```

### 19.2 Mandatory Recovery Rule

The MVP should not force the user to save a recovery code before writing the first letter.

However, the system must strongly encourage the user to configure at least one durable recovery method.

### 19.3 Trusted Devices

A trusted device may store protected key material that allows the vault to be unlocked again from that device.

The User Vault Key must not be stored in plaintext.

Trusted-device storage must follow ADR-002.

### 19.4 Passkeys

Passkeys must be supported from the beginning of the MVP, following ADR-002.

The UX should use simple language:

> “Use your device PIN, fingerprint, or face recognition to protect your letters.”

The application must gracefully handle browsers without full passkey support.

### 19.5 Recovery Code

The recovery code may be postponed by the user.

The recovery code must:

- provide at least 128 bits of entropy;
- be generated client-side using a secure random source;
- be human-readable when possible;
- be processed using a memory-hard KDF where supported;
- protect an encrypted copy of the User Vault Key;
- never be stored in plaintext by the backend;
- be shown only when generated or regenerated.

Recovery-code-derived keys must use Argon2id when supported. If Argon2id is not available in the browser environment, PBKDF2-SHA-256 with a high iteration count may be used as a compatibility fallback, but this must be explicitly documented.

KDF parameters must be versioned and stored with the recovery envelope metadata.

---

## 20. Irreversible Access Loss Communication

The product must communicate the recovery limitation clearly without scaring the user.

### Suggested Copy — Short Version

> “Your letters are protected in a way that our team cannot read or unlock them. To access them on a new device, you’ll need a trusted device, a passkey, or your recovery code.”

### Suggested Copy — Recovery Code Prompt

> “Save your recovery code to make sure you can access your private letters if you lose this device. Because your letters are private, our team cannot recover them for you without one of your recovery methods.”

### Suggested Copy — User Postpones Recovery Code

> “You can do this later. Just remember: if you lose access to this device before setting up another recovery method, we may not be able to restore your private letters.”

### Suggested Copy — Irrecoverable Case

> “For your privacy, we do not have a way to read or unlock your private letters. If you no longer have access to a trusted device, passkey, or recovery code, those private letters cannot be restored.”

---

## 21. Application Vault

“Application Vault” is a logical concept, not necessarily a separate product in the MVP.

For the MVP, the Application Vault may be implemented as a combination of environment-managed application secrets and encrypted database records.

It must not be implemented as a place where user decryption material is stored in plaintext.

The Application Vault may store:

- encrypted vault envelopes;
- application secrets;
- metadata required for trusted devices;
- public keys;
- recovery envelope metadata;
- audit records;
- revoked device records.

The Application Vault must not store:

- plaintext User Vault Key;
- plaintext Letter Key;
- plaintext recovery code;
- plaintext private letter title;
- plaintext private letter body;
- anything sufficient to decrypt private letters without the user.

Primary rule:

> The backend must never possess enough material to decrypt private letters by itself.

---

## 22. Data Model — Conceptual

Implementation details are defined in ADR-003.

General requirements:

- use UUID primary keys;
- use `timestamptz` for all timestamps;
- use foreign keys for user-owned records;
- cascade delete user-owned vault and letter records where appropriate;
- use structured encrypted payloads;
- scope every user-owned query by authenticated user ID.

### 22.1 users

```text
id UUID primary key
email text
auth_provider text
created_at timestamptz
updated_at timestamptz
```

### 22.2 user_vaults

```text
id UUID primary key
user_id UUID foreign key
vault_version text
created_at timestamptz
updated_at timestamptz
```

Does not store the plaintext User Vault Key.

### 22.3 vault_envelopes

```text
id UUID primary key
user_id UUID foreign key
method text
encrypted_vault_key jsonb
kdf_metadata jsonb nullable
public_metadata jsonb
created_at timestamptz
revoked_at timestamptz nullable
```

Possible methods:

```text
trusted_device
passkey
recovery_code
```

### 22.4 trusted_devices

```text
id UUID primary key
user_id UUID foreign key
device_name text
device_public_key text or jsonb
browser text
platform text
device_type text
created_at timestamptz
last_used_at timestamptz
revoked_at timestamptz nullable
```

Users may rename devices and register with an optional friendly name. The **This device** badge matches `device_public_key.deviceId` to the browser’s local device id. `last_used_at` is refreshed on successful vault unlock for registered devices.

### 22.5 letters

```text
id UUID primary key
user_id UUID foreign key
encrypted_title jsonb
encrypted_body jsonb
encrypted_letter_key jsonb
encryption_version text
answered boolean
answered_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

No `deleted_at` column for letters in the MVP unless a short-lived deletion workflow is explicitly implemented and tested.

---

## 23. Deletion Policy

The MVP must support real deletion of user content from active application storage.

When a user deletes a letter, the application must delete:

- encrypted title;
- encrypted body;
- encrypted Letter Key;
- associated encrypted private notes;
- letter-specific metadata not needed for security or legal reasons.

When a user deletes the account, the application must delete:

- user profile, unless minimal legal/security retention applies;
- encrypted letters;
- vault records;
- vault envelopes;
- trusted devices;
- recovery envelopes;
- application-level user data.

Private letter content and key material must be deleted on account deletion.

Minimal non-content security audit records may be retained for a defined period if legally and operationally necessary, but must not contain private letter content or key material.

Backup deletion and retention policy will be defined in a future phase.

Until that future policy is defined, the product must avoid promising deletion from all backups in real time.

---

## 24. Backups

Encrypted backup strategy is out of scope for MVP finalization.

For now:

- active storage must store only encrypted private letter content;
- backups, if present, must also contain only encrypted private letter content;
- plaintext private letters must never be written to backups.

A backup and restore policy is required before onboarding real users beyond internal testing.

---

## 25. Key Rotation

Key rotation strategy is out of scope for MVP implementation, but encryption versioning is required.

Required field:

```text
encryption_version
```

Future TDR must define:

- User Vault Key rotation;
- Letter Key rotation;
- recovery envelope rotation;
- compromised device handling;
- migration between encryption versions.

---

## 26. Threat Model Gate

A formal threat model is not required for local prototype.

A formal threat model is required before any public or private beta involving real users.

The threat model must cover at least:

- database leak;
- malicious admin;
- compromised frontend deploy;
- XSS;
- stolen device;
- lost recovery code;
- phishing;
- account takeover;
- malicious browser extension;
- third-party script compromise;
- compromised OAuth account;
- backup exposure;
- logging misconfiguration;
- supply chain attack;
- compromised build pipeline;
- malicious or mistaken AI-agent-generated code.

---

## 27. Future Anonymous Sharing Model

Not included in MVP, but the architecture must not block it.

The future sharing flow must work as follows:

1. User chooses to share a letter anonymously.
2. Client decrypts the private letter locally.
3. Client creates a separate temporary copy for sharing.
4. The copy is sent to moderation and anonymization.
5. Sensitive personal information is removed or replaced.
6. User reviews the anonymized version.
7. User confirms publication.
8. Only the anonymized shared version is published.
9. The original private letter remains encrypted and private.

---

## 28. Future Community Prayer Model

Not included in MVP, but the future community feature should initially allow only:

- viewing anonymized approved letters;
- clicking “I prayed for you”;
- showing the author an anonymous prayer count.

Future community MVP should not include:

- comments;
- private replies;
- user-to-user messaging;
- ranking;
- public profiles;
- spiritual reputation scores.

---

## 29. Future Moderation Model

Not included in this MVP, but future anonymous sharing must include moderation.

Letters with suicidal or violent risk should trigger a care-oriented flow, not merely a rejection.

Because private letters are not read by the system, the MVP cannot detect crisis content inside private letters.

The product should provide static support resources and crisis guidance in the UI without scanning private content.

---

## 30. Operational Security Requirements

### 30.1 Logs

The system must never log:

- plaintext title;
- plaintext body;
- User Vault Key;
- Letter Key;
- recovery code;
- decrypted payloads;
- user input from letter fields.

Operational logs may include metadata required for reliability and security investigation:

- request ID;
- endpoint;
- status code;
- latency;
- error code;
- event type;
- internal user ID, where necessary.

### 30.2 Analytics

Analytics must not capture:

- letter title input;
- letter body input;
- recovery code;
- decrypted content;
- screens containing private letter text.

No session replay should be enabled on private letter screens.

### 30.3 Error Tracking

Error tracking must strip:

- request bodies;
- response bodies;
- headers containing sensitive data;
- local cryptographic material;
- form values;
- decrypted content.

### 30.4 Admin Panel

The admin panel may show:

- user id;
- email;
- auth provider;
- account status;
- number of letters;
- created date;
- last activity;
- trusted device count;
- recovery method status.

The admin panel must not show:

- plaintext letter title;
- plaintext letter body;
- decrypted private notes;
- recovery code;
- cryptographic secrets.

---

## 31. Audit Events

Audit logs must never include plaintext letter content, encrypted payloads unless necessary, recovery code, or key material.

Allowed audit event types:

- login success;
- login failure;
- vault initialized;
- recovery code generated/regenerated;
- trusted device added;
- trusted device revoked;
- failed unlock attempt;
- passkey added;
- passkey removed;
- account deletion requested;
- letter deleted, without title/body.

---

## 32. Rate Limiting

Rate limiting is required for:

- authentication;
- recovery-code attempts;
- passkey registration;
- passkey authentication;
- vault unlock attempts;
- trusted-device creation;
- account deletion requests.

---

## 33. Development Environment Strategy

The target production database should be PostgreSQL.

For local development, acceptable options are:

1. PostgreSQL through Docker Compose.
2. A hosted development PostgreSQL instance.
3. A local PostgreSQL installation.
4. SQLite only for limited prototyping, if explicitly marked as non-production.

No agent should claim that database migrations or integration tests were validated against PostgreSQL unless they were actually run against PostgreSQL.

---

## 34. Docker Compose Recommendation

The project should include a Docker Compose setup for local development.

Recommended services:

```text
app
postgres
```

Optional future services:

```text
redis
mailpit
worker
```

The MVP should not require Redis unless there is a concrete need.

---

## 35. Low-Cost / Free Deployment Strategy

The MVP may start on a low-cost or free stack for development, demos, and early validation.

Recommended low-cost/free setup:

```text
Next.js application: Vercel Hobby
PostgreSQL database: Neon Free or Supabase Free
```

Preferred initial option:

```text
Next.js on Vercel
PostgreSQL on Neon
```

Important rule:

Even when using Supabase or Neon, the frontend must not bypass the application API.

Allowed:

```text
Browser
  -> Next.js frontend
  -> Application API
  -> Service layer
  -> Repository/ORM
  -> PostgreSQL
```

Not allowed:

```text
Browser
  -> PostgreSQL directly

Browser
  -> Supabase client directly for private letter persistence
```

Free or hobby-tier infrastructure is acceptable for development, demos, internal validation, and very small private beta only.

Before onboarding real users at meaningful scale, the project should move to paid tiers with clearer guarantees around availability, backups, monitoring, support, database retention, and operational limits.

---

## 36. Environment Separation

The MVP should define at least three environments:

```text
local
staging
production
```

Local environment must not use real user data.

Seed data must use fake encrypted payloads and must never include real user letters.

Staging must use a separate database, separate OAuth credentials, separate secrets, and production-like builds.

Production must use strict deployment approvals, no debug logging of sensitive flows, analytics disabled on private letter screens, and monitoring with payload redaction.

---

## 37. Compliance, Privacy, and Safety Gates

Before public beta, the project must define:

- privacy/legal review;
- LGPD considerations;
- data subject rights;
- account deletion and retention;
- privacy policy language;
- primary hosting/data residency region;
- terms of use;
- age policy.

MVP should be 18+ unless a dedicated minors/privacy/safety review is completed.

Before onboarding real users beyond internal testing, the project must define:

- backup and restore policy;
- formal threat model;
- incident response;
- production monitoring;
- log redaction validation;
- external security review plan.

---

## 38. MVP Functional Scope

### Included

1. Account creation.
2. Google login.
3. Apple login.
4. Email/password login.
5. User vault initialization.
6. User Vault Key generation on client.
7. Create private letter.
8. Generate safe default title if user leaves title blank.
9. Encrypt title.
10. Encrypt body.
11. Generate Letter Key per letter.
12. Encrypt Letter Key with User Vault Key.
13. Store encrypted letter in backend.
14. List user letters.
15. Decrypt letters locally.
16. Edit letter.
17. Delete letter from active storage.
18. Mark letter as answered.
19. Register trusted device.
20. List trusted devices.
21. Revoke trusted device.
22. Passkey support from the beginning.
23. Recovery code generation.
24. Recovery code may be postponed.
25. Unlock vault on a new device using available recovery method.
26. Responsive web interface.
27. API-first frontend/backend boundary.
28. PostgreSQL relational database.
29. Local development strategy.
30. Low-cost/free deployment strategy.
31. Encrypted autosave if autosave is implemented.
32. Rate limiting for sensitive flows.
33. Audit events without sensitive content.
34. Sentinel phrase tests for plaintext leakage.

### Excluded

1. Blockchain.
2. Native mobile app.
3. Community sharing.
4. Community prayer count.
5. Anonymous public feed.
6. AI moderation.
7. AI responses.
8. Human responses.
9. Comments.
10. Private messaging.
11. Social recovery.
12. Backup design finalization.
13. Key rotation finalization.
14. Public profiles.
15. Gamification.
16. Direct frontend-to-database access.
17. Plaintext autosave.
18. Server Actions for private letter persistence.

---

## 39. Acceptance Criteria

The MVP will be considered acceptable when:

1. A user can create an account.
2. A user can sign in with Google.
3. A user can sign in with Apple.
4. A user can sign in with email/password.
5. A User Vault Key is generated on the client.
6. A user can create a private letter.
7. A user can leave the title blank and receive a safe generated title.
8. The title is encrypted before storage.
9. The body is encrypted before storage.
10. The backend never receives plaintext private letter title or body.
11. The database stores only encrypted title and encrypted body.
12. Admins cannot read private letters through the database or admin panel.
13. The user can view and decrypt their own letters.
14. The user can edit a letter.
15. The user can delete a letter from active storage.
16. The user can mark a letter as answered.
17. The answered status is stored as open metadata.
18. The user can register a trusted device.
19. The user can list trusted devices.
20. The user can revoke a trusted device.
21. Passkey support exists in the MVP.
22. The user can generate a recovery code with at least 128 bits of entropy.
23. The user can postpone recovery code setup.
24. The user can unlock the vault on a new device using an available recovery method.
25. Logs do not contain private letter content.
26. Analytics do not capture private letter input.
27. Error tracking does not capture private content.
28. The UI clearly explains the privacy and recovery trade-off.
29. Frontend code does not access the database directly.
30. Private letter persistence happens through explicit API endpoints.
31. PostgreSQL schema exists for the MVP data model.
32. Local development can run with PostgreSQL via Docker Compose or a hosted development database.
33. Deployment strategy supports a low-cost/free MVP setup.
34. Server Actions are not used for private letter persistence.
35. Encrypted payloads follow the structured schema from ADR-001.
36. Sentinel phrase tests prove plaintext does not appear in database records, API responses, logs, or admin endpoints.
37. Recovery-code-derived keys use versioned KDF metadata.
38. Rate limiting exists for auth, recovery, passkey, and unlock flows.
39. Every user-owned API query is scoped by authenticated user ID.
40. A formal threat model is scheduled before any beta involving real users.

---

## 40. Product Copy — Privacy Promise

Recommended product promise:

> “Your private letters are protected on your device before they are saved. Our systems are designed so our team does not have access to the keys required to read them.”

Extended version:

> “Your private letters are encrypted on your device before they are stored. To access them on a new device, you’ll need a trusted device, passkey, or recovery code.”

Recovery limitation:

> “Because your letters are private, our team cannot unlock them for you without one of your recovery methods.”

---

## 41. Cursor / Agent Development Premises

The project must include agent-facing rule files:

```text
AGENTS.md
SECURITY.md
ARCHITECTURE.md
.cursor/rules/security.md
.cursor/rules/architecture.md
.cursor/rules/crypto.md
.cursor/rules/testing.md
```

### 41.1 Core Rule

Agents must never implement a backend path that receives or stores plaintext private letter content.

Private letter title and body must be encrypted before being sent to the backend.

### 41.2 Stop Conditions

If implementation requires choosing a cryptographic primitive, storage model, passkey key-wrapping model, or recovery envelope design not explicitly defined in this TDR or the ADRs, the agent must stop and request human review.

### 41.3 No Security Placeholders in Production

Mock encryption, fake passkey flows, fake recovery flows, or placeholder vault unlock logic must never be merged into production branches.

### 41.4 No AI Processing of Private Letters

Agents must not call AI APIs using private letter content.

Private letters are not to be summarized, classified, moderated, embedded, or analyzed by AI in the MVP.

### 41.5 Sentinel Phrase Tests

Security tests must create a letter with a unique sentinel phrase and verify that the phrase does not appear in:

- database records;
- API responses where encrypted payloads are expected;
- logs;
- error tracking;
- admin endpoints;
- analytics events.

### 41.6 Implementation Warning

If an agent cannot implement a secure cryptographic flow completely, it must stop and mark the section as requiring human review.

Allowed placeholder format:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This implementation is incomplete and must not be used in production.
```

---

## 42. Required ADRs

The following ADRs are part of this TDR and are required before implementation:

1. **ADR-001 — Cryptographic Payload Format and Envelope Encryption**
2. **ADR-002 — Vault Unlocking, Passkeys, Trusted Devices, and Recovery Code**
3. **ADR-003 — API Contract, Database Schema, and No-Plaintext Enforcement**

---

## 43. Executive Summary

The MVP will deliver a private encrypted letter vault for users writing “letters to God.”

The product will be web-first and responsive. Users may authenticate with Google, Apple, or email/password, but authentication alone will not decrypt letters.

Private letter title and body will be encrypted on the client before storage. The backend will store only encrypted content and open operational metadata, including the answered status.

The MVP will support trusted devices, passkeys from the beginning, and optional recovery code setup. Users may postpone recovery code setup, but the product must clearly communicate the importance of recovery methods.

The application will use Next.js with an API-first architecture and PostgreSQL as the target relational database. The frontend must consume explicit APIs and must not access the database directly.

A low-cost/free deployment strategy may use Vercel for Next.js and Neon or Supabase for PostgreSQL during development, demos, and early validation. Before meaningful production usage, the system should move to paid infrastructure with clearer guarantees around backups, availability, monitoring, and support.

Admins and support staff must not be able to read private letters.

The product’s core promise is:

> “Your private letters are protected on your device before they are saved. Our systems are designed so our team does not have access to the keys required to read them.”

This privacy promise is the foundation of the product and must not be weakened by implementation shortcuts.
