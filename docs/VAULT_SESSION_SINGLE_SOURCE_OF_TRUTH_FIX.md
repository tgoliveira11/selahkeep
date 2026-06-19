# Vault Session Single Source of Truth Fix

**Product:** SelahKeep  
**Status:** Implemented

## Root cause

After migrating crypto primitives to `@tgoliveira/vault-core`, SelahKeep still needed an **app-owned** in-memory vault session controller. The regression appeared when:

1. Password unwrap succeeded (no API error).
2. The User Vault Key (UVK) was written through a path that did **not** clear `manuallyLocked` on the SelahKeep session controller.
3. UI subscribers (`useVaultSessionUnlocked`, Vault Status Dock, notes gates) read `hasUserVaultKey && !manuallyLocked`.

The failure mode was especially visible after **manual lock → password unlock**: decrypt completed, but the dock and pages stayed `locked`.

`@tgoliveira/vault-core/browser` also exports its own session helpers. Importing those alongside a local controller can create **duplicate in-memory stores** under dev bundling. SelahKeep must not use vault-core browser session state as app state.

## Fix

### Approved local session module

```text
src/lib/crypto-client/vault-session.ts
```

This module is the **only** owner of:

- in-memory `CryptoKey` (UVK)
- `locked` / `unlocked` status
- manual lock flag
- auto-lock timer + last activity
- subscriber notifications

Public API (app-facing):

- `setUnlockedVaultSession({ userVaultKey, method })`
- `getUserVaultKey()` / `getSessionVaultKey()`
- `hasUnlockedVaultSession()`
- `getVaultSessionSnapshot()`
- `lockVaultSession(reason)`
- `lockVaultSessionManually()`
- `subscribeVaultSession(listener)`
- auto-lock helpers (`touchVaultSession`, `scheduleVaultAutoLock`, …)

`src/modules/vault/core/vault-key.ts` and `src/modules/vault/client/vault-session.ts` are **thin re-exports** of this module.

### Approved vault-core browser adapter (PRF only)

```text
src/lib/crypto-client/vault-passkey-browser.ts
```

May import `@tgoliveira/vault-core/browser` for **passkey PRF helpers only** (salt bytes, PRF detection, extension parsing). It must **not** store UVK or session lock state.

### Disallowed imports

`@tgoliveira/vault-core/browser` must **not** be imported from:

- `src/features/**`
- `src/components/**`
- `src/app/**`
- `src/modules/**` (except re-export shim to approved adapter)
- `src/server/**`

Enforced by `src/test/security/vault-session-single-source.test.ts`.

## Password unlock flow

1. User submits vault password (dock or `/vault/unlock`).
2. `POST /api/vault/unlock-envelope` returns **HTTP 200** with the **encrypted** password envelope only. This is expected even when the password is wrong — the server never receives or checks the vault password.
3. `unwrapVaultKeyFromPassword` decrypts client-side via `@tgoliveira/vault-core` or the legacy AAD candidate path.
4. On success, **`setUnlockedVaultSession({ userVaultKey, method: "password" })`** runs in the global session store (`globalThis.__selahkeepVaultSessionStore`).
5. Subscribers update Vault Status Dock, `useVaultClientStatus`, and notes gates immediately.

## Manual lock flow

`lockVaultSessionManually()` → `lockVaultSession("manual")`:

1. Clears in-memory UVK.
2. Clears decrypted note body cache.
3. Sets manual lock flag.
4. Notifies all subscribers.

## Auto-lock flow

Inactivity timer calls `lockVaultSession("auto_lock")` on the **same** controller. Countdown reads `getVaultAutoLockRemainingMs()` from the same module.

## Logout / account switch

`clearVaultClientState()` calls `lockVaultSession("logout")` and purges legacy trusted-device IndexedDB. UVK is never persisted.

## Cache clearing

Manual and auto lock call `clearNoteBodyCache()` before notifying subscribers.

## Tests added/updated

- `src/test/security/vault-session-single-source.test.ts` — reproduction + import boundary
- `src/test/security/vault-core-boundaries.test.ts` — module wiring
- `src/test/unit/crypto-vault.test.ts` — session apply vs no-apply
- `src/test/unit/vault-manual-lock.test.ts` — gate reads `hasUnlockedVaultSession`

## Remaining risks

- Dev-only duplicate-controller warning relies on `globalThis` guard; production safety is enforced by single module path + static import tests.
- Future vault-core upgrades must keep session state in SelahKeep's `vault-session.ts`, not re-adopt vault-core browser session exports.
