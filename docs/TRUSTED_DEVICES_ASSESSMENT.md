# Trusted Devices — Technical and Product Assessment

**Date:** 2026-06-17  
**Scope:** Codebase inspection only (`src/**`, `drizzle/**`, `docs/**`, `src/test/**`, `.env.example`, `README.md`, `ARCHITECTURE.md`, `SECURITY.md`). No application changes were made to produce this document.

---

## Executive summary

| # | Question | Answer |
|---|----------|--------|
| 1 | Is Trusted Devices currently implemented? | **Yes.** Full stack: PostgreSQL `trusted_devices` table, `trusted_device` vault envelopes, REST APIs, IndexedDB device secrets, client unlock flow, UI at `/vault/devices`, and extensive tests. |
| 2 | Is it active in user-facing flows? | **Partially.** Primary LTG Vault (`vault-v2`) setup and unlock UX centers on vault password, recovery phrase, and passkey PRF. Trusted devices remain active for **legacy `vault-v1` users**, as a **legacy unlock path** on `/vault/unlock` for `vault-v2` users who still have `trusted_device` envelopes, via **silent auto-unlock** in `useRequireVault`, and through **`/vault/devices`** (linked from Vault settings). |
| 3 | Can it unlock the vault? | **Yes**, when the browser has a matching local device secret + encrypted vault envelope and the server considers the device **active** (or the client is **offline** and uses cached material). It unwraps the User Vault Key client-side; the server never decrypts. |
| 4 | Does it overlap with passkey vault unlock? | **Yes, at the UX and local-cache layers, not at the crypto primitive layer.** Passkey PRF uses WebAuthn PRF output; trusted devices use a local AES-GCM device secret. `persistUnlockedVaultOnDevice` reuses `buildDeviceVaultEnvelope` to cache a **local-only** envelope after passkey unlock, but that cache does **not** register a server trusted device and **fails online silent unlock** when `GET /api/trusted-devices/status` returns `not_registered`. |
| 5 | Does it introduce meaningful technical debt? | **Yes — medium.** Legacy envelope type, dual unlock stacks (LTG vs legacy), IndexedDB + server row coupling, offline revocation gap, and UI copy still referencing “letters” in places. Code is tested and documented but diverges from TDR MVP envelope set. |
| 6 | Is it needed for LTG Vault MVP? | **No.** `docs/TDR_LTG_Vault_MVP.md` lists MVP envelopes as `password`, `recovery_phrase`, `passkey_prf` and marks `trusted_device` as **future optional**. `docs/LTG_VAULT_IMPLEMENTATION_PLAN.md` explicitly keeps trusted devices during migration, not as a required new-user path. |
| 7 | Recommended next decision? | **Formalize legacy-only posture (Option B):** keep trusted-device unlock and revocation for existing `vault-v1` / pre-migration users; do **not** promote or require it for new `vault-v2` setup; consider hiding `/vault/devices` for users with no active trusted devices; defer any redesign to a future `trusted_device_future` ADR. This is a **recommendation**, not a product decision. |

---

## 1. Current implementation map

| File / module | Purpose | Client / server / both | Public API / internal / UI / test / schema / docs | Still used? | Imported by (representative) | Depends on | Security relevance | Notes |
|---------------|---------|------------------------|---------------------------------------------------|-------------|------------------------------|------------|-------------------|-------|
| `drizzle/0000_condemned_morbius.sql` | Initial `trusted_devices` table | Schema | schema | yes | migrations | `users` FK | Stores display metadata + `device_public_key` JSON; no key bytes | Created with vault MVP |
| `drizzle/0001_right_ozymandias.sql` | Adds `device_type` column | Schema | schema | yes | migrations | — | Display only | — |
| `drizzle/0003_trusted_device_client_id_webauthn_indexes.sql` | Adds `client_device_id`, backfill from JSON, partial unique index on active rows | Schema | schema | yes | migrations | — | Enforces one active row per `(user_id, client_device_id)` | Also adds unrelated webauthn indexes |
| `src/lib/db/app-schema.ts` — `trustedDevices` | Drizzle table definition | Server | schema | yes | repository | `users` cascade | Column definitions for identity + metadata | `clientDeviceId`, `devicePublicKey`, `revokedAt` |
| `src/modules/vault/repositories/trusted-device-repository.ts` | DB access: `findByUserId`, `findActiveByClientDeviceId`, `create`, `revoke`, etc. | Server | internal | yes | `trusted-device-service`, `vault-service` | Drizzle `trustedDevices` | Identity match by `clientDeviceId` or `devicePublicKey.deviceId` | `maxDevices` from `MAX_TRUSTED_DEVICES` |
| `src/server/repositories/trusted-device-repository.ts` | Shim re-export | Server | internal | yes | API routes via service shim | module repository | — | `@deprecated` shim |
| `src/modules/vault/services/trusted-device-service.ts` — `trustedDeviceService` | Business logic: `list`, `create`, `getClientDeviceState`, `revoke`, `touchLastUsed`, `rename`, `removeRevoked` | Server | internal | yes | API routes | repository, `vaultRepository`, `auditRepository`, rate limit, AAD validation | Transactional create/revoke with envelope link; rate limit on create | `create` is idempotent for same active `clientDeviceId` |
| `src/server/services/trusted-device-service.ts` | Shim re-export | Server | internal | yes | API routes | module service | — | — |
| `src/modules/vault/services/vault-service.ts` | `init` creates trusted device + envelope; `getStatus` returns `trustedDeviceCount`; `getTrustedDeviceEnvelopes` filters by active devices | Server | internal | yes | vault API routes | `trustedDeviceRepository` | Links `publicMetadata.trustedDeviceId` | `setup` (LTG) does **not** create trusted devices |
| `src/app/api/trusted-devices/route.ts` | `GET` list, `POST` create | Server | public API | yes | client `trustedDevicesApi` | `requireSessionUser`, `trustedDeviceService` | Session required; POST accepts encrypted envelope only | Rate limited |
| `src/app/api/trusted-devices/status/route.ts` | `GET` `?deviceId=` → `{ state, trustedDeviceId? }` | Server | public API | yes | `trustedDevicesApi.deviceState`, unlock flow | session, service | Unlock gating | States: `active`, `revoked`, `not_registered` |
| `src/app/api/trusted-devices/touch/route.ts` | `POST` update `lastUsedAt` | Server | public API | yes | `recordTrustedDeviceUnlock` | session, service | Non-blocking telemetry | Returns revoked state |
| `src/app/api/trusted-devices/[id]/route.ts` | `PATCH` rename, `DELETE` revoke | Server | public API | yes | `trustedDevicesApi` | session, service | Revoke also revokes linked envelope | — |
| `src/app/api/trusted-devices/[id]/remove/route.ts` | `POST` delete revoked row | Server | public API | yes | `trustedDevicesApi.remove` | session, service | Cleanup only for revoked rows | — |
| `src/app/api/vault/device-envelopes/route.ts` | `GET` active `trusted_device` envelopes | Server | public API | yes | `vaultApi.deviceEnvelopes` | `vaultService.getTrustedDeviceEnvelopes` | Returns ciphertext only | Used during unlock |
| `src/lib/validation/trusted-devices.ts` | Zod: `createTrustedDeviceSchema`, `updateTrustedDeviceSchema`, `touchTrustedDeviceSchema` | Both | internal | yes | API routes | `encryptedPayloadSchema` | Rejects malformed payloads | `deviceId` must be UUID for touch |
| `src/lib/validation/vault.ts` | `VaultInitInput` allows `trusted_device` + `trustedDevice` nested object | Both | internal | yes | vault init API | encrypted payload schemas | Plaintext vault key rejected | LTG `VaultSetupInput` does not include trusted device |
| `src/lib/api-client/trusted-devices.ts` — `trustedDevicesApi` | Client HTTP wrapper | Client | public API client | yes | UI, crypto unlock | `apiClient` | — | `list`, `create`, `rename`, `touch`, `deviceState`, `revoke`, `remove` |
| `src/lib/crypto-client/device-storage.ts` | IndexedDB `letters-vault` v2: `device_secrets`, `vault_envelopes` | Client | internal | yes | vault, unlock, devices page | `idb`, `crypto.subtle` | Non-extractable `CryptoKey` device secret; encrypted UVK envelope only | Wipes v1 stores on upgrade |
| `src/lib/crypto-client/vault.ts` — `buildDeviceVaultEnvelope`, `wrapVaultKeyForDevice`, `unwrapVaultKeyFromDevice`, `clearVaultClientState` | Device envelope crypto + session integration | Client | internal | yes | use-vault, devices page, passkey cache | `device-storage`, `aes-gcm` | UVK never stored plaintext in IDB | `clearVaultClientState` on revoke |
| `src/lib/crypto-client/vault-unlock.ts` — `assertTrustedDeviceCanUnlock`, `unlockVaultFromDeviceEnvelopes` | Online status check + multi-envelope unlock | Client | internal | yes | `unwrapVaultKeyFromDevice`, `useRequireVault` | `trustedDevicesApi`, `vaultApi`, errors, verification | Fail-closed online; offline exception | Clears IDB on revoke/unknown |
| `src/lib/crypto-client/trusted-device-unlock-errors.ts` | Typed errors + `classifyTrustedDeviceApiError` | Client | internal | yes | vault-unlock, use-vault | `ApiError` | Fail-closed on 401/403/404/5xx | — |
| `src/lib/crypto-client/trusted-device-unlock-verification.ts` | `verified-online` vs `allowed-offline` verification types | Client | internal | yes | vault-unlock, use-vault | — | Documents offline trade-off | `TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE` |
| `src/lib/crypto-client/record-device-unlock.ts` — `recordTrustedDeviceUnlock` | Post-unlock `touch` call | Client | internal | yes | vault-unlock | `trustedDevicesApi` | Clears local state if touch reports revoked | Swallows errors (offline/unregistered) |
| `src/lib/crypto-client/passkey-vault.ts` — `persistUnlockedVaultOnDevice` | Caches device envelope locally after passkey unlock | Client | internal | yes | passkey unlock flow | `buildDeviceVaultEnvelope`, `device-storage` | Local cache only; **no** server trusted device row | Overlaps storage, not registration |
| `src/modules/vault/lib/trusted-device-utils.ts` | `getTrustedDeviceClientId`, `isCurrentTrustedDevice`, `isDeviceAlreadyRegistered` | Client | internal | yes | `/vault/devices` page | API types | Identity = `clientDeviceId` only | — |
| `src/lib/trusted-device-utils.ts` | Deprecated shim | Client | internal | yes | — | module utils | — | — |
| `src/lib/device-display-info.ts` | Browser/OS/form-factor metadata for display | Client | internal | yes | devices page, use-vault init | UA parsing | Display only; not identity proof | — |
| `src/features/vault/use-vault.ts` — `initializeVault`, `unlockFromDevice` | Legacy init creates `trusted_device` envelope; explicit device unlock | Client | UI hook | yes | unlock page, legacy flows | crypto + APIs | Legacy init auto-trusts browser | LTG setup uses `useLtgVaultSetup` instead |
| `src/features/vault/use-ltg-vault-setup.ts` | LTG vault setup | Client | UI hook | yes | `/vault/setup` | password + recovery phrase only | **No trusted device envelope** | — |
| `src/features/vault/use-require-vault.ts` | Silent `unwrapVaultKeyFromDevice` when not manually locked | Client | UI hook | yes | notes pages, vault gates | vault-unlock | Auto-unlock without user gesture if material exists | Blocked when `isVaultManuallyLocked()` |
| `src/app/(vault)/vault/devices/page.tsx` | Trusted devices management UI | Client | UI | yes | nav from settings | APIs + crypto | Requires vault unlocked to register | Copy still mentions “letters” |
| `src/app/(vault)/vault/unlock/page.tsx` | Routes LTG vs legacy unlock | Client | UI | yes | — | `LtgVaultUnlockPanel`, `VaultUnlockPanel` | Legacy device unlock in both modes | LTG: device under “Other methods” |
| `src/features/vault/ltg-vault-unlock-panel.tsx` | LTG unlock UI; legacy device button when `trustedDeviceCount > 0` | Client | UI | yes | unlock page | — | — | Primary methods: password, phrase, passkey |
| `src/features/vault/vault-unlock-panel.tsx` | Legacy unlock UI — “Unlock on this device” | Client | UI | yes | unlock page | — | — | Used for `vault-v1` |
| `src/app/(vault)/vault/settings/page.tsx` | Link to `/vault/devices` under “Legacy trusted devices” | Client | UI | yes | — | — | — | Framed as advanced/legacy |
| `src/modules/vault/server.ts` | Exports `trustedDeviceService` | Server | internal | yes | tests, future modules | — | — | — |
| `.env.example` — `MAX_TRUSTED_DEVICES` | Config default 50 | Both | docs/config | yes | repository | — | Abuse limit | Documented in `VERCEL_ENVIRONMENT_VARIABLES.md` |
| `docs/openapi.yaml` | OpenAPI for trusted-device routes | Docs | docs | yes | — | — | Contract reference | Missing `/remove` route detail |
| `ARCHITECTURE.md`, `SECURITY.md`, `README.md` | Architecture and security documentation | Docs | docs | yes | — | — | Authoritative behavior descriptions | Aligned with code |
| `docs/TDR_LTG_Vault_MVP.md` | Product source of truth | Docs | docs | yes | — | — | `trusted_device` = future optional | — |
| `docs/LTG_VAULT_IMPLEMENTATION_PLAN.md` | Phased plan | Docs | docs | yes | — | — | Not in MVP required envelopes | — |
| `docs/archive/adr/ADR-002_*` | Historical trusted device ADR | Docs | docs (archived) | historical | — | — | Superseded by ADR-005/006 | — |

---

## 2. Database / schema assessment

### Table: `trusted_devices`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Server trusted device row ID; stored in envelope `publicMetadata.trustedDeviceId` |
| `user_id` | uuid FK → `users.id` ON DELETE **CASCADE** | Account linkage |
| `client_device_id` | text nullable | Client-generated UUID (browser storage profile identity) |
| `device_name` | text | User-facing label |
| `device_public_key` | jsonb nullable | `{ deviceId: string }` — **not** a WebCrypto public key; legacy identity carrier |
| `browser`, `platform`, `device_type` | text nullable | Display metadata only |
| `created_at`, `last_used_at`, `revoked_at` | timestamptz | Lifecycle |

### Indexes

- `idx_trusted_devices_user_id` — list by user
- `idx_trusted_devices_user_client_device_id` — lookup by profile
- `idx_trusted_devices_active_user_client_device_id` — **partial unique** on `(user_id, client_device_id)` WHERE `revoked_at IS NULL AND client_device_id IS NOT NULL`

### Relationship to `vault_envelopes`

- Method `trusted_device` rows hold **encrypted User Vault Key** (`encrypted_vault_key` jsonb).
- `public_metadata.trustedDeviceId` links envelope → `trusted_devices.id`.
- On revoke: `trustedDeviceService.revoke` sets `trusted_devices.revoked_at` and revokes matching envelope(s) in one transaction.
- **No separate `vault_unlock_envelopes` table** — product uses `vault_envelopes` for all methods.

### Overlap with other envelopes

| Method | Coexists with trusted_device? | Notes |
|--------|------------------------------|-------|
| `password` | Yes | LTG MVP |
| `recovery_phrase` | Yes | LTG MVP |
| `passkey_authorized_device` / PRF | Yes | LTG MVP; different crypto path |
| `recovery_code` | Yes | Legacy |
| `trusted_device` | — | One envelope per trusted device row |

### Plaintext metadata

Server stores **only** display metadata and encrypted envelopes. No plaintext note content, vault password, recovery phrase, or exportable device secret bytes.

### Migration history

1. `0000` — table created with `device_public_key`, no `client_device_id`
2. `0001` — `device_type`
3. `0003` — `client_device_id` backfilled from `device_public_key->>'deviceId'`; partial unique index; removed metadata-based relink risk (documented in threat model)

### Account / vault linkage

- Trusted devices are per **user** (account), not per `user_vaults` row directly.
- FK cascade: deleting user removes trusted devices and vault envelopes.
- Account sessions (`account_sessions`) are **separate** — revoking a session does not revoke trusted devices.

---

## 3. Routes / API assessment

| Route | Method | Purpose | Auth | Vault unlocked required? | Secrets in request? | Encrypted envelopes? | Affects vault unlock? | Duplicates passkey? | Risks | Plaintext rejection |
|-------|--------|---------|------|--------------------------|---------------------|----------------------|----------------------|---------------------|-------|---------------------|
| `/api/trusted-devices` | GET | List all devices (active + revoked) | Session | No | No | No | Indirect (management) | No | Lists metadata | N/A |
| `/api/trusted-devices` | POST | Register device + create `trusted_device` envelope | Session | No (client should be unlocked to wrap UVK) | No plaintext UVK; `encryptedVaultKey` only | Yes | Yes — adds unlock method | No (different method) | Rate limit `trusted_device.create`; device limit | `assertVaultKeyAad`; Zod encrypted payload |
| `/api/trusted-devices/status` | GET | `deviceId` → state | Session | No | No | No | Yes — unlock gate | No | Must not leak other users' devices (scoped by session user) | Invalid UUID → 400 |
| `/api/trusted-devices/touch` | POST | Update `lastUsedAt` | Session | No | No | No | Telemetry only | No | Low | UUID validation |
| `/api/trusted-devices/:id` | PATCH | Rename | Session | No | No | No | No | No | Revoked device → conflict | Name length 1–200 |
| `/api/trusted-devices/:id` | DELETE | Revoke device + envelope | Session | No | No | No | Yes — removes unlock path | No | User must understand current device revoke clears client state in UI | — |
| `/api/trusted-devices/:id/remove` | POST | Delete revoked row | Session | No | No | No | No | No | Only revoked rows | — |
| `/api/vault/device-envelopes` | GET | Active trusted_device ciphertexts | Session | No | No | Returns encrypted only | Yes — unlock candidate fetch | No | Returns only envelopes tied to **active** devices | No decryption server-side |

**Passkey duplication:** Passkey vault unlock uses `/api/account/passkeys/*`, `/api/auth/passkey/login/vault-unlock/*`, and `passkey_authorized_device` envelopes — separate routes and envelope method. Trusted device APIs do not perform WebAuthn.

---

## 4. Client storage assessment

| Storage | Key / store | What is stored | Persistence | Incognito | Cleared when |
|---------|-------------|----------------|-------------|-----------|--------------|
| IndexedDB `letters-vault` v2 | `device_secrets` keyed by `userId` | `deviceId` (UUID), non-extractable AES-GCM `deviceSecretKey` | Per browser profile | Separate profile → separate `deviceId` | `clearLocalVaultData`, IDB v1→v2 upgrade wipe, revoke detection, `clearVaultClientState` |
| IndexedDB `letters-vault` v2 | `vault_envelopes` keyed by `userId` | `encryptedVaultKey` (AES-GCM ciphertext of UVK) | Same | Same | Same as above |
| `sessionStorage` | — | **Not** used for trusted device secrets | — | — | — |
| `localStorage` | — | **Not** used for trusted device material (per `SECURITY.md`) | — | — | — |
| In-memory | `sessionVaultKey` in `vault.ts` / `vault-session.ts` | Unwrapped UVK `CryptoKey` | Tab session | Tab session | Lock, logout flows, revoke |

### `clientDeviceId`

- Generated as `crypto.randomUUID()` on first `getOrCreateDeviceSecret(userId)`.
- Copied to server as `devicePublicKey.deviceId` and `client_device_id` column.
- **Identity** for “This device” badge and unlock gating.

### Can it unlock the vault?

**Yes**, if:
1. Local `deviceSecretKey` can decrypt a stored or fetched `encryptedVaultKey`, and
2. Online: `GET /api/trusted-devices/status` returns `active` (or offline network failure allows local-only path).

### Exportable keys?

**No** — `createDeviceSecretKey()` uses `generateKey(..., extractable: false)`. Legacy v1 string secrets were wiped on DB version bump.

### Hardware backing?

**No** — software AES-GCM key in IndexedDB, not TPM/Secure Enclave bound (unlike passkey PRF on supported authenticators).

---

## 5. Vault unlock assessment

| # | Question | Answer (from code) |
|---|----------|-------------------|
| 1 | Is `trusted_device` a vault unlock envelope type? | **Yes** — `vault_envelopes.method = 'trusted_device'`. |
| 2 | Is it created during LTG (`vault-v2`) setup? | **No** — `useLtgVaultSetup` sends only `password` and `recovery_phrase` envelopes. |
| 3 | Is it created during legacy (`vault-v1`) init? | **Yes** — `useVault.initializeVault` sends a `trusted_device` envelope and stores local copy. |
| 4 | Can a user add it after LTG setup? | **Yes** — `/vault/devices` → `POST /api/trusted-devices` while vault is unlocked. |
| 5 | Does silent auto-unlock use trusted devices? | **Yes** — `useRequireVault` calls `unwrapVaultKeyFromDevice(userId, undefined, { explicit: false })` when not manually locked. |
| 6 | Does manual lock block silent trusted-device unlock? | **Yes** — `isVaultManuallyLocked()` short-circuits; `unlockVaultFromDeviceEnvelopes` also throws if manually locked and not explicit. |
| 7 | What server check runs before unlock? | `assertTrustedDeviceCanUnlock` → `GET /api/trusted-devices/status?deviceId=`. |
| 8 | What happens if device is revoked online? | Local IndexedDB cleared; `RevokedTrustedDeviceError`; vault session locked on revoke of current device in UI. |
| 9 | What happens offline? | Network errors → `allowed-offline` verification; local envelope may still decrypt; status re-checked on reconnect. |
| 10 | Where do envelope candidates come from? | Local IndexedDB first, then `GET /api/vault/device-envelopes` (active trusted_device rows only). |
| 11 | Does account session alone unlock the vault? | **No** — session required for API calls but UVK unwrap is client-side with device secret. |
| 12 | Does passkey unlock replace trusted device? | **No** — separate envelopes. Passkey may write **local-only** device envelope via `persistUnlockedVaultOnDevice` without server registration. |
| 13 | Will passkey-local cache enable silent unlock on next visit (online)? | **No**, if never registered as trusted device — `not_registered` clears local data and throws `UnknownTrustedDeviceError`. |
| 14 | Is trusted device shown in LTG primary unlock UI? | **Only** under “Other methods” when `trustedDeviceCount > 0` or legacy recovery code exists; not a primary LTG path. |

### Unlock flow (simplified)

```text
Account session (NextAuth)
  → getOrCreateDeviceSecret(userId)  [IndexedDB]
  → assertTrustedDeviceCanUnlock     [GET /api/trusted-devices/status]
  → collect local + server envelopes [GET /api/vault/device-envelopes]
  → decrypt UVK with deviceSecret    [crypto.subtle]
  → setSessionVaultKey / unlockVaultSession
  → recordTrustedDeviceUnlock        [POST /api/trusted-devices/touch]
```

---

## 6. UX assessment

| Surface | Route / component | What user sees | When it appears | LTG Vault fit | Old language | Passkey conflicts | Account vs vault confusion | Should remain? |
|---------|-------------------|----------------|-----------------|---------------|--------------|-------------------|---------------------------|----------------|
| Trusted devices manager | `/vault/devices` — `TrustedDevicesPage` | List, rename, revoke, “Trust this browser”, “This device” badge | Vault unlocked; linked from settings | Legacy/advanced | “letters” in empty state | User may think passkey = trusted device | Name “trusted devices” vs account sessions | **Yes for legacy users**; optional hide for pure LTG |
| Vault settings link | `/vault/settings` | “Legacy trusted devices” button | Vault unlocked | Correctly framed as legacy | — | Points users away from passkey settings | Helps distinguish from account security | **Yes** (as legacy link) |
| LTG unlock | `LtgVaultUnlockPanel` | Password, phrase, passkey primary; “Unlock with this device” under Other methods | `vault-v2` + `setupComplete` | Good LTG alignment | “Legacy unlock methods” label | Passkey is separate primary button | Clear vault vs account on unlock page | Legacy device button **only if** `trustedDeviceCount > 0` |
| Legacy unlock | `VaultUnlockPanel` | “Unlock on this device” primary/secondary | `vault-v1` or legacy init | Legacy path | “letters”, recovery code | Passkey shown if envelope exists | — | **Yes** until `vault-v1` retired |
| Silent unlock | `useRequireVault` (no UI) | Notes pages load without extra prompt | Trusted material + active device + not manually locked | Convenient but opaque | — | Competes with passkey auto-unlock story | User may not realize vault unlocked | **Keep for legacy**; LTG users mostly use password/passkey |
| Offline notice | `VaultUnlockPanel` / `useVault.offlineNotice` | Offline unlock warning | Device unlock when status check offline | Rare edge case | — | — | — | **Yes** while offline path exists |

**Navigation audit** (`docs/LOGGED_IN_NAVIGATION_AUDIT.md`): `/vault/devices` marked **Legacy** — “Move” / link from Vault settings only.

---

## 7. Security assessment

### Benefits (verified in code)

- **Convenience** on return visits for registered browser profiles (legacy users).
- **Revocation** — server revokes envelope with device; online check before unlock; client clears IndexedDB on revoke.
- **Fail-closed online** — 401/403/404/5xx and `not_registered` block unlock (except genuine network/offline).
- **Non-extractable device secret** — reduces casual IDB copy exfiltration vs legacy v1.
- **Storage profile identity** — `clientDeviceId` only; no metadata auto-relink (security tests guard this).
- **Rate limiting** on device registration.
- **AAD binding** on encrypted vault key payloads.
- **Transactional** create/revoke consistency.

### Risks

| Risk | Severity | Evidence |
|------|----------|----------|
| Local keys in IndexedDB (XSS, malware, physical access) | Medium–High | Software `CryptoKey` in IDB; XSS could invoke crypto in-browser |
| Offline unlock after revocation | Medium | Documented trade-off: cached envelope works until online check |
| Shared computer | Medium | Anyone with unlocked browser profile + account session |
| Incognito treated as new device | Low (by design) | Separate `clientDeviceId`; may confuse users |
| Passkey vs trusted device confusion | Medium | Both enable “unlock on this device” wording; different security properties |
| No hardware backing | Medium | Weaker than passkey PRF on secure authenticator |
| `not_registered` clears passkey-local cache | Low | `persistUnlockedVaultOnDevice` without registration does not persist across online visits |
| Spoofing server row without device secret | Low | Cannot decrypt without local secret |
| Stolen profile / backup | Medium | Encrypted envelope + device secret in same IDB profile |

---

## 8. Product value assessment

| # | Question | Assessment |
|---|----------|------------|
| 1 | Does it solve a real user problem? | **Yes for legacy `vault-v1` users** who relied on “unlock on this device” without entering recovery material each time. **Marginal for new LTG users** who have vault password + phrase + passkey. |
| 2 | Is it differentiated from passkey vault unlock? | **Partially.** Passkey offers hardware-backed PRF and clearer security story; trusted device is browser-profile-bound software crypto. |
| 3 | Is it required for MVP? | **No** per TDR and implementation plan. |
| 4 | Does it help migration from legacy? | **Yes** — avoids forcing immediate re-enrollment for existing trusted-device users. |
| 5 | Does it confuse account sessions vs vault trust? | **Somewhat** — naming overlaps “devices” in account session list vs vault trusted devices; docs mitigate but UI still exposes both concepts. |
| 6 | Incognito / multi-profile UX cost? | **High support burden** — each profile is a separate trusted device; users may accumulate rows. |
| 7 | Value on mobile? | **Unclear** — works if IndexedDB persists; no mobile-specific implementation found. |
| 8 | Competitive / market expectation? | **Optional** — password managers use “trusted device”; LTG positions passkey + vault password as primary. |
| 9 | Cost to maintain vs value for new users? | **Low value / non-zero cost** for new LTG users; **higher value** only for legacy cohort. |

---

## 9. Technical debt assessment

**Level: Medium**

| Factor | Rating | Explanation |
|--------|--------|-------------|
| Code volume | Medium | ~26 dedicated files + vault integration + tests |
| Test coverage | Low debt | Strong security/unit/service/API tests |
| Product alignment | High drift | Not in LTG MVP envelope set; dual legacy/LTG paths |
| Crypto complexity | Medium | Parallel to passkey PRF + password KDF paths |
| Schema | Low | Stable table; partial unique index; cascade deletes |
| UX debt | Medium | “Letters” copy, legacy labels, settings link ambiguity |
| Documentation | Low | ARCHITECTURE/SECURITY/README largely accurate |
| Removal cost | High | Requires legacy user migration before delete |

---

## 10. Options and recommendation

### Option A — Status quo (maintain full implementation)

Keep all APIs, UI, silent unlock, and allow **any** unlocked user to register trusted devices (including post-LTG setup).

| Dimension | Assessment |
|-----------|------------|
| Product value | Legacy + optional convenience for LTG power users |
| Security posture | Unchanged; known offline gap remains |
| UX clarity | Weak for LTG — extra “device” concept |
| Implementation effort | None |
| Migration risk | None |

### Option B — Legacy-only freeze (recommended direction)

Keep unlock/revoke for existing `trusted_device` envelopes and `vault-v1` users; **do not** create new trusted_device envelopes for `vault-v2` users (block `POST /api/trusted-devices` or hide UI when `ltgSetupComplete`).

| Dimension | Assessment |
|-----------|------------|
| Product value | Preserves legacy; aligns new users with TDR |
| Security posture | Slightly better — fewer software-key profiles over time |
| UX clarity | Improves LTG story |
| Implementation effort | Low–medium (guardrails + copy) |
| Migration risk | Low — existing rows untouched |

### Option C — UI deprecation only

Remove `/vault/devices` from navigation and LTG unlock legacy section; keep backend for silent unlock until data ages out.

| Dimension | Assessment |
|-----------|------------|
| Product value | Low for new users; stranding risk if users cannot manage devices |
| Security posture | Users cannot self-revoke via UI |
| UX clarity | Better until user needs revocation |
| Implementation effort | Low |
| Migration risk | Medium — support burden |

### Option D — Full removal

Migrate all legacy users to password/phrase/passkey; drop table, APIs, IndexedDB path, tests.

| Dimension | Assessment |
|-----------|------------|
| Product value | Clean LTG surface |
| Security posture | Removes software device-key path |
| UX clarity | Best long-term |
| Implementation effort | High |
| Migration risk | **High** — data loss if users lack other envelopes |

### Option E — Future redesign (`trusted_device_future`)

Remove current implementation after migration; redesign per TDR future optional envelope with security review (possibly hardware-backed or distinct from current IDB model).

| Dimension | Assessment |
|-----------|------------|
| Product value | Unknown until designed |
| Security posture | Potential improvement |
| UX clarity | Deferred |
| Implementation effort | Very high |
| Migration risk | Depends on design |

### Recommendation (not a decision)

**Pursue Option B (legacy-only freeze)** as the near-term product/engineering decision:

1. LTG MVP does not require trusted devices; new setup already excludes them.
2. Legacy users still need unlock and revocation until they migrate envelopes.
3. Avoid Option D until migration metrics show zero or negligible `trusted_device` reliance.
4. Defer Option E unless product explicitly requests browser-trust convenience post-MVP with a new ADR.

---

## 11. Tests and documentation references

### Test files

| File | Purpose | Coverage | Gaps |
|------|---------|----------|------|
| `src/test/api/trusted-devices-routes.test.ts` | API route contracts | GET/POST/PATCH/DELETE/touch/status | — |
| `src/test/services/trusted-device-service.test.ts` | Service logic, idempotency, revoke | create, rename, revoke, limits | — |
| `src/test/services/trusted-device-state.test.ts` | `getClientDeviceState` states | active/revoked/not_registered | — |
| `src/test/security/trusted-device-identity.test.ts` | No metadata relink; per-profile isolation | identity, idempotent create | — |
| `src/test/security/trusted-device-revocation-unlock.test.ts` | Unlock hardening, offline, fail-closed | `assertTrustedDeviceCanUnlock`, full unlock | — |
| `src/test/security/trusted-device-revocation.test.ts` | Revocation behavior | server revoke | — |
| `src/test/security/indexeddb-storage.test.ts` | IDB security static analysis | non-extractable keys | Runtime IDB not exercised |
| `src/test/unit/trusted-device-utils.test.ts` | Client ID helpers | `getTrustedDeviceClientId` | — |
| `src/test/unit/trusted-device-unlock-errors.test.ts` | Error classification | API errors | — |
| `src/test/unit/trusted-device-unlock-verification.test.ts` | Offline notice | verification types | — |
| `src/test/unit/record-device-unlock.test.ts` | Touch on unlock | happy path | — |
| `src/test/unit/crypto-vault-unlock*.test.ts` | Device envelope unlock | local/server candidates | — |
| `src/test/unit/vault-manual-lock.test.ts` | Manual lock blocks silent unlock | — | — |
| `src/test/services/vault-service*.test.ts` | Init with trusted device, `getTrustedDeviceEnvelopes` | vault integration | — |
| `src/test/security/no-local-auth-implementation.test.ts` | Boundary guard | lists trusted-devices route as allowed product route | — |

**Gaps:** No dedicated E2E (Playwright removed per `docs/TESTING_STRATEGY.md`); no UI test for `/vault/devices` page; no test for LTG user registering trusted device after setup (behavior exists but untested as LTG scenario).

### Documentation classification

| Document | Status | Notes |
|----------|--------|-------|
| `ARCHITECTURE.md` | **Accurate** | Trusted device identity, offline limitation, APIs |
| `SECURITY.md` | **Accurate** | IDB rules, revocation, fail-closed |
| `README.md` | **Accurate** | Trusted devices section; still says “letters” in vault separation copy |
| `docs/TDR_LTG_Vault_MVP.md` | **Accurate** | `trusted_device` future optional |
| `docs/LTG_VAULT_IMPLEMENTATION_PLAN.md` | **Accurate** | Not MVP required |
| `docs/THREAT_MODEL_Private_Letters_Vault.md` | **Accurate** | Identity, auto-relink removal |
| `docs/UI_UX_DIRECTION.md` | **Accurate** | Legacy preservation noted |
| `docs/LOGGED_IN_NAVIGATION_AUDIT.md` | **Accurate** | `/vault/devices` legacy |
| `docs/API_REFERENCE.md` | **Needs update** | Does not document trusted-device routes (points to openapi) |
| `docs/openapi.yaml` | **Mostly accurate** | Missing `POST .../remove` |
| `docs/LGPD_BETA_GATES.md` | **Partially outdated** | References “encrypted letters” cascade; behavior correct for notes |
| `docs/archive/adr/ADR-002_*` | **Archived / outdated** | Historical source |
| `docs/LTG_VAULT_AGENT_IMPLEMENTATION_GUIDE.md` | **Accurate** | No trusted device in vault setup guide |

---

## Appendix: Environment variables

| Variable | Default | Used by |
|----------|---------|---------|
| `MAX_TRUSTED_DEVICES` | `50` | `trusted-device-repository.ts` |

---

*This assessment documents current behavior only. No code, schema, or configuration was modified.*
