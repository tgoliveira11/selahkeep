# ADR-001 — Cryptographic Payload Format and Envelope Encryption

## Status

Accepted for MVP implementation.

## Context

The Private Letters Vault MVP must encrypt private letter title and body on the client before sending anything to the backend.

The previous TDR established the principles of client-side encryption and envelope encryption, but implementation requires a concrete cryptographic payload format so that developers and AI agents do not invent incompatible or unsafe approaches.

## Decision

The MVP will use a structured, versioned encrypted payload format for all encrypted private fields.

The cryptographic model is:

```text
Letter title/body
  encrypted with a per-letter Letter Key

Letter Key
  encrypted with the User Vault Key

User Vault Key
  protected through vault envelopes defined in ADR-002
```

## Cryptographic Primitives

### Symmetric Encryption

Use:

```text
AES-GCM
256-bit keys
96-bit random IV/nonce per encryption operation
```

Every encryption operation must use a unique random IV/nonce.

IV reuse with the same key is forbidden.

### Randomness

All keys and IVs must be generated using browser cryptographically secure randomness.

In browser environments, use Web Crypto secure random APIs.

### Associated Authenticated Data

Encrypted payloads should use AAD where feasible.

Recommended AAD fields:

```text
userId
letterId
fieldName
encryptionVersion
```

Example field names:

```text
title
body
letter_key
vault_key
```

AAD is not secret. It helps bind ciphertext to context and reduce misuse.

## Encrypted Payload Format

Encrypted fields must not be arbitrary strings.

They must follow a structured schema.

Recommended JSON shape:

```json
{
  "version": "enc-v1",
  "alg": "AES-GCM",
  "iv": "base64url-encoded-96-bit-random-iv",
  "ciphertext": "base64url-encoded-ciphertext-with-auth-tag",
  "aad": {
    "userId": "uuid",
    "resourceId": "uuid",
    "field": "title"
  }
}
```

If implementation separates auth tag from ciphertext, the schema may include:

```json
{
  "version": "enc-v1",
  "alg": "AES-GCM",
  "iv": "...",
  "ciphertext": "...",
  "tag": "...",
  "aad": {
    "userId": "uuid",
    "resourceId": "uuid",
    "field": "body"
  }
}
```

The project must choose one representation and use it consistently.

## Database Storage

Recommended PostgreSQL storage type:

```text
jsonb
```

for:

```text
encrypted_title
encrypted_body
encrypted_letter_key
encrypted_vault_key
```

This allows the backend to validate payload structure without understanding or decrypting content.

## Letter Key

For every new letter:

1. Generate a random 256-bit Letter Key.
2. Encrypt title with Letter Key.
3. Encrypt body with Letter Key.
4. Encrypt Letter Key with User Vault Key.
5. Send only encrypted payloads to the API.

## User Vault Key

The User Vault Key is generated client-side.

It must never be sent to the backend in plaintext.

It must never be stored in plaintext in the database, logs, analytics, or admin tools.

The User Vault Key is protected through vault envelopes defined in ADR-002.

## Recovery Code Key Derivation

Recovery-code-derived keys must use a KDF.

Preferred:

```text
Argon2id
```

Fallback:

```text
PBKDF2-SHA-256 with a high iteration count
```

Fallback is allowed only when Argon2id is not viable in the browser environment.

KDF parameters must be versioned and stored with the recovery envelope metadata.

Example KDF metadata:

```json
{
  "kdf": "argon2id",
  "version": "kdf-v1",
  "salt": "base64url-random-salt",
  "memory": 65536,
  "iterations": 3,
  "parallelism": 1
}
```

PBKDF2 fallback metadata example:

```json
{
  "kdf": "pbkdf2-sha256",
  "version": "kdf-v1",
  "salt": "base64url-random-salt",
  "iterations": 600000
}
```

Exact parameters must be reviewed before production.

## Recovery Code Entropy

Recovery codes must provide at least:

```text
128 bits of entropy
```

The recovery code may be human-readable, but must not be weak.

**Format (MVP):** Implemented in `src/lib/crypto-client/recovery-code.ts`. Words are drawn uniformly at random (with rejection sampling) from a **project-specific English wordlist** — this is **not BIP39** and must **not** be described as BIP39-compatible. Duplicates in the source list are removed; word count is computed dynamically as `ceil(128 / log2(unique wordlist size))`.

**Current parameters:** 17 words from a 252-word unique list → approximately **135.6 bits** of entropy (`getRecoveryCodeEntropyBits()`).

Acceptable example (format: hyphen-separated words; word count follows the formula above):

```text
river-candle-forest-window-silver-anchor-harbor-fabric-lantern-cloud-meadow-thunder-crystal-horizon-willow-ember-canyon
```

Short six-word examples are not acceptable unless the wordlist and word count provide at least 128 bits of entropy.

## Encryption Versioning

Every encrypted payload must include:

```text
version
alg
```

Every encrypted record must include:

```text
encryption_version
```

Initial value:

```text
enc-v1
```

Future versions must be introduced through a new ADR or migration plan.

## Failure Handling

If decryption fails:

- do not attempt to send ciphertext or key material to support;
- do not log plaintext, ciphertext, or key material;
- show a user-safe message;
- suggest trying another recovery method;
- record a non-sensitive audit event.

Suggested user message:

> “We could not unlock this letter on this device. Please try a trusted device, passkey, or recovery code.”

## Backend Validation

The backend must validate encrypted payload structure.

The backend must reject:

- `title`;
- `body`;
- `content`;
- `plaintextTitle`;
- `plaintextBody`;
- malformed encrypted payloads;
- encrypted payloads missing `version`, `alg`, `iv`, or `ciphertext`.

The backend cannot perfectly prove that ciphertext is real ciphertext, but it must enforce strict schema validation.

## Sentinel Phrase Testing

Security tests must create a letter with a unique sentinel phrase and verify that the phrase does not appear in:

- database records;
- API responses where plaintext is not expected;
- logs;
- error tracking;
- admin endpoints;
- analytics events.

## Consequences

### Positive

- Consistent encrypted payloads.
- Less room for agent/developer improvisation.
- Easier validation at API boundaries.
- Future key rotation and migration become easier.
- Better support for security testing.

### Negative

- More implementation complexity.
- Requires careful frontend cryptographic code.
- Requires strong testing discipline.
- Requires future review before production launch.

## Non-Negotiable Rules

1. Plaintext private letter title/body must never cross the client/server boundary.
2. The backend must treat encrypted payloads as opaque.
3. The backend must not decrypt private letters.
4. Recovery code must have at least 128 bits of entropy.
5. Recovery-code-derived keys must use a versioned KDF.
6. IV reuse with the same key is forbidden.
7. Any cryptographic uncertainty must trigger `TODO_SECURITY_REVIEW_REQUIRED`.

## Implementation Notes (MVP)

Implemented in:

- `src/lib/crypto-client/recovery-code.ts` — dynamic word-count generation from a 252-word unique project wordlist (17 words → ~135.6 bits entropy); **not BIP39**; uniform selection with rejection sampling; `getRecoveryCodeEntropyBits()` ≥ 128; Argon2id primary, PBKDF2-SHA-256 (600k iterations) fallback with `kdf-v1` metadata.
- `src/server/policies/aad-validation.ts` — server-side AAD validation before letter/vault storage.
- `src/lib/crypto-client/aad-verify.ts` — client-side AAD verification before decrypt.
- Letter IDs: client generates UUID (`src/app/(vault)/letters/new/page.tsx`); server persists same ID (`letter-repository.ts`).
- Tests: `src/test/security/recovery-code.test.ts` (mathematical entropy), `src/test/security/aad-validation.test.ts`, `src/test/unit/aad-verify.test.ts`, `src/test/security/sentinel-encrypted-payload.test.ts`.
