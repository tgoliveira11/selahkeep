# ADR-002 — Vault Unlocking, Passkeys, Trusted Devices, and Recovery Code

## Status

Accepted for MVP implementation with security-review constraints.

## Context

The Private Letters Vault MVP must allow users to access encrypted letters across devices while preserving the promise that the application cannot decrypt private letters on its own.

The MVP supports:

- trusted devices;
- passkeys;
- recovery code.

However, passkeys/WebAuthn are primarily authentication/signature mechanisms, not general-purpose encryption keys. Therefore, this ADR defines safe boundaries and implementation expectations.

## Decision

The MVP will use a User Vault Key generated on the client.

The User Vault Key will be protected through vault envelopes.

Supported envelope methods:

```text
trusted_device
passkey_authorized_device
recovery_code
```

Passkeys must not be assumed to directly encrypt or decrypt the User Vault Key unless a reviewed, supported key-wrapping design is implemented.

For the MVP, passkeys may authorize access to locally stored encrypted vault material, but the cryptographic design must be implemented according to this ADR and reviewed before production.

## User Vault Key Lifecycle

### Creation

1. User authenticates.
2. Client initializes vault.
3. Client generates User Vault Key.
4. Client creates at least one vault envelope for the current device.
5. Client offers passkey setup and recovery code generation.

### Use

1. User authenticates.
2. Client checks for local trusted-device vault material.
3. Client unlocks the User Vault Key using an available method.
4. Client uses the User Vault Key to unwrap Letter Keys.
5. Client decrypts letters locally.

### Loss

If the user loses all trusted devices, passkeys, and recovery codes, private letters cannot be restored.

## Trusted Devices

A trusted device is a device/browser environment that has been authorized to unlock the user vault.

A trusted device must never store the plaintext User Vault Key persistently.

Allowed local storage:

```text
IndexedDB with encrypted vault envelope
session memory for short-lived unlocked vault key
```

Forbidden local storage:

```text
localStorage with plaintext key
sessionStorage with plaintext key
cookies with plaintext key
URL params with key material
```

## Trusted Device Limit

Trusted devices are conceptually unlimited from the product perspective.

The implementation must enforce a configurable safety limit.

Initial default:

```text
50 trusted devices per user
```

## Trusted Device Management

The UI must allow the user to:

- list trusted devices;
- identify current device (match client `deviceId` in `devicePublicKey`, show **This device** badge);
- register the current browser only when it is not already registered (server rejects duplicate `deviceId`);
- optionally set a friendly name on registration, or rename later;
- see browser, OS platform, and form factor (`desktop` / `mobile` / `tablet`) from `getDeviceDisplayInfo()`;
- see creation date;
- see last used date (updated on each successful vault unlock when the browser is registered);
- revoke device.

Stored server metadata per trusted device:

```text
device_name (user-visible label; default from browser/OS/form factor)
device_public_key.deviceId (client UUID for “this device” matching)
browser, platform, device_type
created_at, last_used_at, revoked_at
```

When a device is revoked:

- related vault envelope must be revoked;
- device must no longer unlock the vault;
- active sessions should be invalidated when feasible;
- audit event must be recorded without sensitive content.

## Passkeys

Passkeys are included in the MVP.

Passkeys may be used for:

- authentication;
- authorizing vault unlock;
- protecting access to a local encrypted vault envelope;
- adding a new trusted device when supported.

Passkeys must not be represented as a magical encryption key unless the implementation supports a reviewed key-wrapping mechanism.

Forbidden implementation shortcuts:

- using a WebAuthn signature directly as an encryption key;
- treating social login + passkey auth as sufficient to decrypt server-held key material;
- storing User Vault Key plaintext after passkey success;
- storing passkey challenge/response as a reusable secret.

## Browser Compatibility

The application must gracefully handle browsers without full passkey support.

Fallbacks:

- recovery code;
- existing trusted device;
- reauthorization from another trusted device, if implemented;
- clear user messaging.

Suggested user message:

> “This browser may not support passkeys. You can still use a recovery code or another trusted device.”

## Recovery Code

Recovery code is the durable fallback.

The recovery code:

- may be postponed;
- must be generated client-side;
- must have at least 128 bits of entropy (project-specific wordlist in `recovery-code.ts` — **not BIP39**; currently 17 words from 252 unique words ≈ 135.6 bits);
- must be shown only when generated or regenerated;
- must never be stored in plaintext;
- must derive a key using a versioned KDF;
- must wrap an encrypted copy of the User Vault Key.

## Recovery Code UX

After the first letter is saved, the product should encourage recovery setup.

Suggested message:

> “Save your recovery code to make sure you can access your private letters if you lose this device. Because your letters are private, our team cannot recover them for you without one of your recovery methods.”

If the user postpones:

> “You can do this later. Just remember: if you lose access to this device before setting up another recovery method, we may not be able to restore your private letters.”

## Vault Recovery State

The system should classify recovery state:

```text
Protected
  at least two recovery methods configured

Basic
  only current trusted device configured

At Risk
  no durable recovery method configured
```

This state may be shown in the UI to encourage safer setup.

## New Device Flow

1. User authenticates on a new device.
2. Backend confirms account identity.
3. Client checks for local vault unlock material.
4. If missing, UI prompts for one of:
   - recovery code;
   - passkey, if supported;
   - trusted device authorization, if implemented.
5. Client unwraps or reconstructs the User Vault Key locally.
6. New device may be registered as trusted.
7. Backend stores only encrypted vault envelope metadata.

## Device Authorization Flow

If implemented in the MVP:

1. New device requests authorization.
2. Existing trusted device receives authorization request.
3. User approves on existing trusted device.
4. Existing trusted device rewraps vault material for the new device.
5. Backend stores only encrypted envelope.
6. Backend never sees the User Vault Key plaintext.

This flow may be deferred if recovery code and passkey unlock are sufficient for MVP.

## Rate Limiting

Rate limiting is required for:

- recovery code attempts;
- vault unlock attempts;
- passkey registration;
- passkey authentication;
- trusted device creation;
- trusted device authorization requests.

## Audit Events

Audit events must be recorded for:

- vault initialized;
- recovery code generated/regenerated;
- trusted device added;
- trusted device revoked;
- passkey added;
- passkey removed;
- failed unlock attempt;
- new device authorized.

Audit events must not include:

- recovery code;
- User Vault Key;
- Letter Key;
- plaintext letter content;
- encrypted payloads unless strictly necessary.

## Security Review Gate

Before production use with real users, the exact implementation of:

- trusted device local storage;
- passkey unlock behavior;
- vault envelope wrapping;
- recovery-code KDF parameters;

must be reviewed.

If implementation uncertainty exists, the agent/developer must stop and mark:

```text
TODO_SECURITY_REVIEW_REQUIRED:
Vault unlocking implementation requires human security review.
```

## Consequences

### Positive

- Supports login social without turning social login into decryption.
- Gives users recovery options.
- Keeps admin unable to decrypt private letters.
- Avoids unsafe assumptions about passkeys.

### Negative

- More complex than standard auth.
- Browser compatibility varies.
- Requires careful UX to avoid frightening users.
- Requires dedicated testing and review.

## Non-Negotiable Rules

1. The backend must never hold the User Vault Key in plaintext.
2. Passkeys must not be misused as raw encryption keys.
3. Recovery code must have at least 128 bits of entropy.
4. Trusted devices must be revocable.
5. Revoked devices must not continue to unlock the vault.
6. Losing all recovery methods means private letters cannot be restored.

## Implementation Notes (MVP)

Implemented in:

- `src/server/services/vault-service.ts` — vault init creates trusted device first, then envelope with `publicMetadata.trustedDeviceId` (transactional).
- `src/server/services/trusted-device-service.ts` — revoke device + envelope in one transaction; `getClientDeviceState()` for unlock gating.
- `src/lib/crypto-client/vault-unlock.ts` — fail-closed `assertTrustedDeviceCanUnlock()` with typed errors; offline unlock only on network failure
- `src/lib/crypto-client/trusted-device-unlock-errors.ts` — error taxonomy + safe UI messages
- `trusted_devices.client_device_id` + partial unique index on active devices
- `passkeyRepository.consumeValidChallenge()` — atomic challenge consumption
- **Offline limitation:** only when the status request fails due to network unavailability (not 401/403/404/5xx); cached local envelope may decrypt until the next successful online check
- Tests: `src/test/security/trusted-device-revocation-unlock.test.ts`, `src/test/services/trusted-device-state.test.ts`.
