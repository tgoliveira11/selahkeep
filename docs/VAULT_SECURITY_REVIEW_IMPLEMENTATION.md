# Vault Security Review — Implementation Notes

SelahKeep **Vault security review** (`/vault/security`) helps users understand vault protection without exposing secret material.

## Route and gating

| State | Behavior |
|-------|----------|
| Signed out | Existing auth protection via `useRequireVault` |
| No vault | Setup-first prompt → `/vault/setup` |
| Setup incomplete | Continue setup prompt → `/vault/setup` |
| Vault locked | Partial server-safe overview + unlock CTA (dock expand or `/vault/unlock?returnTo=/vault/security`) |
| Vault unlocked | Full security review UI |

Entry point: **Vault settings** (`/vault/settings`) card → **Open security review**.

## Data sources

| Indicator | Source |
|-----------|--------|
| Vault password configured | `GET /api/vault/status` → `hasVaultPassword`, `availableUnlockMethods.password` |
| Recovery phrase configured | `hasRecoveryPhrase`, `availableUnlockMethods.recoveryPhrase` |
| Recovery phrase created/replaced date | `serverStatus.recoveryPhrase.createdAt` / `replacedAt` |
| Passkey vault unlock | `hasPasskey` / `availableUnlockMethods.passkey` + client PRF probe (`probePasskeyPrfEnvironmentAsync`) |
| Auto-lock | Fixed `VAULT_INACTIVITY_MS` (15 minutes) in `vault-session.ts` |
| Last unlock method | **Deferred** — shows “Not tracked yet” |
| Export/import | Static “Not available yet” (planned future phase) |

## Vault Health Summary

Logic: `src/lib/vault/vault-health-summary.ts` (`deriveVaultHealthSummary`).

Levels: `strong`, `good`, `needs_attention`, `incomplete`.

Passkey absence alone does not weaken protection when password + recovery are configured.

## Recovery Drill

**Crypto path:** `src/lib/crypto-client/recovery-drill.ts` → `verifyRecoveryPhraseDrill`.

1. `vaultApi.unlockEnvelope("recovery_phrase")` — ciphertext only (phrase never sent).
2. Local Argon2id unwrap via `deriveRecoveryPhraseKeyFromMetadata`.
3. If vault unlocked: compare derived UVK bytes to `getSessionVaultKey()`.
4. If vault locked: unwrap-only verification; **does not** call `unlockVaultSession`.

**Guarantees:**

- Does not rotate, replace, or invalidate recovery phrase or envelope.
- Does not POST recovery phrase, UVK, or note keys to the server.
- Does not log recovery phrase.
- Records only safe audit events (`recovery_phrase_test_succeeded` / `recovery_phrase_test_failed`).

## Security Event Log

Uses existing `audit_events` table (no schema change).

- Read: `auditRepository.listForUser` filtered by `VAULT_SECURITY_AUDIT_EVENT_TYPES`.
- Write (client): `POST /api/vault/security-events` → `vaultSecurityService.recordClientEvent` with allowlisted event types and `method` metadata only.

**Allowed metadata:** `method` (`password`, `recovery_phrase`, `passkey`, `passkey_prf`).

**Never stored/displayed:** note content, decrypted metadata, vault password, recovery phrase, UVK, note keys, PRF output, raw user agent.

Client recording wired for: vault unlock (password / recovery phrase / passkey PRF), manual lock, auto-lock, recovery drill success/failure.

## Passkey Compatibility Guide

Reuses `passkey-prf-diagnostics` and `PASSKEY_VAULT_UNLOCK_ACCOUNT_LOGIN_NOTE`. Distinguishes account passkey sign-in from vault passkey unlock (WebAuthn PRF required).

## Deferred / limitations

- Last vault unlock method tracking (future-safe design only).
- Encrypted export/import (not available yet).
- User-configurable auto-lock timeout (fixed 15 minutes).

## Security guarantees

1. Account session alone does not unlock vault.
2. Security page never shows decrypted note titles, bodies, categories, or tags.
3. Trusted Devices are not used.
4. No non-PRF passkey vault fallback.
5. Account passkey login behavior unchanged.

## Tests

- `src/test/features/vault-security-page.test.tsx`
- `src/test/features/vault-security-review.test.tsx`
- `src/test/unit/vault-health-summary.test.ts`
- `src/test/unit/recovery-drill.test.ts`
- `src/test/services/vault-security-service.test.ts`
- `src/test/api/vault-security-events-route.test.ts`
