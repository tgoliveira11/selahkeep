# ADR-003 — API Contract, Database Schema, and No-Plaintext Enforcement

## Status

Accepted for MVP implementation.

## Context

The Private Letters Vault MVP uses Next.js and PostgreSQL with an API-first architecture.

The frontend must not access the database directly.

The backend must never receive plaintext private letter title/body.

The API contract and database schema must make plaintext storage difficult or impossible by design.

## Decision

All private letter persistence must go through explicit API routes.

Server Actions are not allowed for private letter persistence in the MVP.

React components must not import database clients or repositories.

Architecture boundary:

```text
React UI
  -> Crypto Client Layer
  -> API Client
  -> API Route
  -> Service
  -> Repository
  -> PostgreSQL
```

Only the Crypto Client Layer may handle plaintext title/body while the user is actively writing or reading.

## API Contracts

### Create Letter

```text
POST /api/letters
```

Allowed payload:

```json
{
  "encryptedTitle": {
    "version": "enc-v1",
    "alg": "AES-GCM",
    "iv": "...",
    "ciphertext": "...",
    "aad": {
      "userId": "...",
      "resourceId": "...",
      "field": "title"
    }
  },
  "encryptedBody": {
    "version": "enc-v1",
    "alg": "AES-GCM",
    "iv": "...",
    "ciphertext": "...",
    "aad": {
      "userId": "...",
      "resourceId": "...",
      "field": "body"
    }
  },
  "encryptedLetterKey": {
    "version": "enc-v1",
    "alg": "AES-GCM",
    "iv": "...",
    "ciphertext": "...",
    "aad": {
      "userId": "...",
      "resourceId": "...",
      "field": "letter_key"
    }
  },
  "encryptionVersion": "enc-v1",
  "answered": false
}
```

Forbidden payload fields:

```text
title
body
content
message
plaintextTitle
plaintextBody
decryptedContent
```

### Update Letter

```text
PUT /api/letters/:id
```

Allowed updates:

- encryptedTitle;
- encryptedBody;
- encryptedLetterKey;
- encryptionVersion;
- answered;
- answeredAt.

Plaintext fields are forbidden.

### Get Letters

```text
GET /api/letters
GET /api/letters/:id
```

Response must return encrypted payloads and open metadata only.

### Delete Letter

```text
DELETE /api/letters/:id
```

Must physically delete the letter from active storage.

Soft delete is not allowed for private letters unless a short-lived deletion workflow is explicitly implemented and tested.

## Backend Validation

The backend must validate:

- authenticated session;
- resource ownership;
- payload schema;
- encryption payload version;
- allowed fields only;
- size limits;
- rate limits where applicable.

The backend must reject:

- plaintext fields;
- malformed encrypted payloads;
- oversized payloads;
- requests for another user’s resources;
- revoked-device unlock attempts;
- invalid recovery attempts.

## Multi-Tenant Authorization

All user-owned records must be scoped by authenticated user ID on every query.

Direct object reference access must be tested.

Examples:

- user A cannot list letters of user B;
- user A cannot read encrypted payloads belonging to user B;
- user A cannot delete user B’s letter;
- user A cannot revoke user B’s device;
- user A cannot access user B’s vault envelopes.

## PostgreSQL Schema Requirements

Use:

```text
UUID primary keys
timestamptz for timestamps
foreign keys for user-owned records
jsonb for structured encrypted payloads
```

### users

```sql
create table users (
  id uuid primary key,
  email text not null,
  auth_provider text not null,
  password_hash text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

`password_hash` stores a **bcrypt digest** for email/password accounts only (cost factor 12). Plaintext passwords must never be persisted. OAuth-only users keep `password_hash` null.

### user_vaults

```sql
create table user_vaults (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  vault_version text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

### vault_envelopes

```sql
create table vault_envelopes (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  method text not null,
  encrypted_vault_key jsonb not null,
  kdf_metadata jsonb,
  public_metadata jsonb,
  created_at timestamptz not null,
  revoked_at timestamptz
);
```

### trusted_devices

```sql
create table trusted_devices (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  device_name text not null,
  device_public_key jsonb,
  browser text,
  platform text,
  created_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);
```

### letters

```sql
create table letters (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  encrypted_title jsonb not null,
  encrypted_body jsonb not null,
  encrypted_letter_key jsonb not null,
  encryption_version text not null,
  answered boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

No `deleted_at` column for letters in MVP unless a reviewed deletion workflow is added.

## Indexes

Recommended:

```sql
create index idx_letters_user_id_created_at on letters(user_id, created_at desc);
create index idx_letters_user_id_answered on letters(user_id, answered);
create index idx_trusted_devices_user_id on trusted_devices(user_id);
create index idx_vault_envelopes_user_id_method on vault_envelopes(user_id, method);
```

## Size Limits

Initial configurable MVP limits:

```text
title plaintext max before encryption: 200 characters
body plaintext max before encryption: 20,000 characters
trusted devices per user: default 50
letters per user: configurable
```

Backend validates encrypted payload size, not plaintext size.

Frontend validates plaintext size before encryption.

## Deletion

Letter deletion must remove active storage rows.

Account deletion must remove:

- letters;
- vault envelopes;
- trusted devices;
- user vault;
- user record, unless legal/security retention applies.

Minimal non-content audit records may be retained for a defined period if necessary.

## Observability

Logs may include:

- request ID;
- endpoint;
- status code;
- latency;
- error code;
- event type;
- internal user ID when necessary.

Logs must not include:

- plaintext title;
- plaintext body;
- encrypted payloads unless necessary;
- recovery code;
- User Vault Key;
- Letter Key;
- decrypted content.

## Admin APIs

Admin APIs may return:

- user id;
- email;
- account status;
- number of letters;
- trusted device count;
- recovery method status;
- created date;
- last activity.

Admin APIs must not return:

- encrypted title/body unless there is a narrowly justified operational reason;
- plaintext title/body;
- decrypted notes;
- recovery code;
- User Vault Key;
- Letter Key.

## Sentinel Phrase Tests

Automated tests must:

1. Create a letter using a unique phrase such as:

```text
SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345
```

2. Verify the sentinel does not appear in:
   - database records;
   - API responses where plaintext is not expected;
   - logs;
   - error tracking;
   - admin endpoints;
   - analytics events.

## Server Actions

Server Actions are not allowed for private letter persistence in the MVP.

If introduced in the future, they must receive encrypted payloads only and must be reviewed through a new ADR.

## Supabase / Neon Constraint

Supabase or Neon may be used as hosted PostgreSQL providers.

The frontend must not use Supabase client direct database access for private letter persistence.

Allowed:

```text
Browser -> Next.js API -> PostgreSQL
```

Not allowed:

```text
Browser -> Supabase database client -> PostgreSQL
```

## Migration Review

All database migrations must be reviewed.

Migrations must not introduce plaintext private content columns.

Forbidden private-letter columns:

```text
title
body
content
message
plaintext_title
plaintext_body
```

Allowed private-letter columns:

```text
encrypted_title
encrypted_body
encrypted_letter_key
```

## Consequences

### Positive

- Strong API boundary.
- Clear database schema.
- Less risk of accidental plaintext storage.
- Easier testing.
- Better agent guidance.

### Negative

- More boilerplate.
- Less convenience from Next.js full-stack shortcuts.
- Requires discipline around API and repository layers.
- Requires test coverage for no-plaintext guarantees.

## Non-Negotiable Rules

1. Frontend must not access the database directly.
2. Private letter persistence must go through explicit API routes.
3. Server Actions are forbidden for private letter persistence in MVP.
4. Database must not contain plaintext title/body.
5. API must reject plaintext fields.
6. All user-owned queries must be scoped by authenticated user ID.
7. Sentinel phrase tests are required.
