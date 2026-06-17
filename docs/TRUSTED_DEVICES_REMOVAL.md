# Trusted Devices Removal — LTG Vault

**Date:** 2026-06-17  
**Status:** Implemented

## Decision

**Trusted Devices is not legacy-only. It is removed from LTG Vault.**

The browser-profile trusted-device unlock path (IndexedDB device secrets, `trusted_devices` table, `trusted_device` vault envelopes, REST APIs, and `/vault/devices` UI) is fully removed from product, codebase, database, APIs, client storage, tests, and active documentation.

**Users must rely on vault password, recovery phrase, or passkey PRF vault unlock.**

## Why removed

- LTG Vault MVP (`docs/TDR_LTG_Vault_MVP.md`) defines unlock envelopes as `password`, `recovery_phrase`, and `passkey_prf` only.
- Trusted devices duplicated convenience offered by passkey PRF with weaker security (software AES-GCM keys in IndexedDB, no hardware backing).
- Dual unlock stacks (legacy trusted device vs LTG password/phrase/passkey) increased product and engineering complexity.
- Silent trusted-device auto-unlock in `useRequireVault` blurred the boundary between account session and vault unlock.

## Remaining unlock methods

| Method | Envelope `method` | Notes |
|--------|-------------------|-------|
| Vault password | `password` | Argon2id KDF; LTG setup required |
| Recovery phrase | `recovery_phrase` | Argon2id KDF; LTG setup required |
| Passkey PRF | `passkey_authorized_device` | WebAuthn PRF; no local device-secret cache |

Account login (password, OAuth, passkey sign-in, TOTP) **does not** unlock the vault.

Legacy `recovery_code` envelopes remain for users who still have them; they are not created for new LTG setup.

## Data migration impact

Migration `drizzle/0011_drop_trusted_devices.sql`:

1. Deletes all `vault_envelopes` rows where `method = 'trusted_device'`.
2. Drops partial unique index `idx_trusted_devices_active_user_client_device_id` (if present).
3. Drops indexes on `trusted_devices`.
4. Drops table `trusted_devices`.

### Risk: users who relied only on trusted-device unlock

Users whose **only** active unlock envelope was `trusted_device` (typical legacy `vault-v1` init) **lose vault access** after migration unless they previously added vault password, recovery phrase, passkey PRF, or recovery code.

**No legacy trusted-device unlock is preserved.** Support must direct affected users to account recovery options outside vault crypto (not available in MVP) or accept data loss.

## Client IndexedDB cleanup

On next app load, `src/lib/crypto-client/vault-idb-cleanup.ts` opens IndexedDB `letters-vault` at version **3**, deletes legacy stores `device_secrets` and `vault_envelopes`, and does not recreate them. Passkey PRF unlock no longer writes a local trusted-device envelope after unlock.

## Files removed (summary)

### API routes
- `src/app/api/trusted-devices/**`
- `src/app/api/vault/device-envelopes/route.ts`

### UI
- `src/app/(vault)/vault/devices/**`

### Server
- `src/modules/vault/repositories/trusted-device-repository.ts`
- `src/modules/vault/services/trusted-device-service.ts`
- `src/server/repositories/trusted-device-repository.ts`
- `src/server/services/trusted-device-service.ts`

### Client crypto / storage
- `src/lib/crypto-client/device-storage.ts`
- `src/lib/crypto-client/vault-unlock.ts`
- `src/lib/crypto-client/trusted-device-unlock-errors.ts`
- `src/lib/crypto-client/trusted-device-unlock-verification.ts`
- `src/lib/crypto-client/record-device-unlock.ts`
- `src/lib/api-client/trusted-devices.ts`
- `src/lib/validation/trusted-devices.ts`
- `src/lib/device-display-info.ts`
- `src/modules/vault/lib/trusted-device-utils.ts`
- `src/lib/trusted-device-utils.ts`

### Tests (trusted-device-only)
- `src/test/api/trusted-devices-routes.test.ts`
- `src/test/services/trusted-device-service.test.ts`
- `src/test/services/trusted-device-state.test.ts`
- `src/test/security/trusted-device-*.test.ts`
- `src/test/unit/trusted-device-*.test.ts`
- `src/test/unit/record-device-unlock.test.ts`
- `src/test/unit/device-storage.test.ts`
- `src/test/unit/crypto-vault-unlock*.test.ts`

## Schema changes

- Removed `trustedDevices` table definition from `src/lib/db/app-schema.ts`.
- Removed `TrustedDevice` type export from `src/lib/db/schema.ts`.
- Added migration `0011_drop_trusted_devices.sql`.

## Test changes

- Added `src/test/security/no-trusted-devices.test.ts` — guards against reintroduction of trusted-device routes, schema, and client modules.
- Updated `no-local-auth-implementation.test.ts` — removed `/api/trusted-devices` from product route allowlist.
- Updated vault, passkey, admin, API, and unlock tests for remaining methods only.

## Documentation updated

Active docs no longer describe trusted devices as a product feature. Historical context remains in:

- `docs/TRUSTED_DEVICES_REMOVAL.md` (this file)
- `docs/TRUSTED_DEVICES_ASSESSMENT.md`
- `docs/archive/**`

Updated: `ARCHITECTURE.md`, `SECURITY.md`, `README.md`, `docs/API_REFERENCE.md`, `docs/openapi.yaml`, `docs/MODULE_BOUNDARIES.md`, `docs/LOGGED_IN_NAVIGATION_AUDIT.md`, `docs/UI_UX_DIRECTION.md`, `docs/TDR_LTG_Vault_MVP.md`, `docs/LTG_VAULT_IMPLEMENTATION_PLAN.md`, `docs/VERCEL_ENVIRONMENT_VARIABLES.md`, `.env.example`, `.cursor/rules/testing.md`.

## Environment

Removed `MAX_TRUSTED_DEVICES` from `.env.example`, `docs/VERCEL_ENVIRONMENT_VARIABLES.md`, and application config.

## Remaining risks / TODOs

- Users with only `trusted_device` envelopes need manual outreach; no in-app migration path.
- Audit log may still contain historical `trusted_device_*` events (read-only; no new events recorded).
- Verify production migration backup before applying `0011`.
