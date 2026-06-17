# Vault Recovery Flow Audit

**Date:** 2026-06-17  
**Scope:** `/vault/recovery`, recovery phrase setup/replacement, legacy `recovery_code`

## Executive summary

| Area | Before | After |
|------|--------|-------|
| `/vault/recovery` | Legacy recovery **code** UI with "Generate recovery code" and "Do this later" | Status-gated recovery **phrase** management + passkey setup |
| vault setup | Already required `recovery_phrase` envelope | Unchanged — invariant enforced server-side |
| Recovery phrase replacement | Not implemented | `POST /api/vault/recovery-phrase` — atomic revoke + create |
| `recovery_code` | Active generation UI on `/vault/recovery` | Legacy unlock only; no new generation for configured vaults |

## Recovery model (SelahKeep)

1. **Account session** — `@tgoliveira/secure-auth`; does not decrypt notes.
2. **Vault password** — Argon2id envelope wraps User Vault Key (UVK); client-only.
3. **Recovery phrase** — BIP39 12/24 words; Argon2id envelope wraps UVK; created at setup; replaceable while unlocked.
4. **Passkey (PRF)** — optional second unlock method; configured on `/vault/recovery` while vault unlocked.

Plaintext recovery phrase and UVK **never** leave the browser. APIs accept only encrypted envelopes + KDF metadata.

## `recovery_code` vs `recovery_phrase`

| | `recovery_phrase` (LTG) | `recovery_code` (legacy) |
|---|-------------------------|---------------------------|
| Format | BIP39 mnemonic (12/24 words) | Random word sequence (legacy crypto module) |
| KDF | Argon2id only | Argon2id / PBKDF2 fallback for old data |
| Setup | Required in `POST /api/vault/setup` | Pre-LTG `POST /api/vault/init` only |
| Management UI | `/vault/recovery` — status + replace | No new generation; unlock panel legacy mode |
| API store | Setup + `POST /api/vault/recovery-phrase` | `POST /api/recovery-code` (legacy, retained) |
| Unlock | `POST /api/vault/unlock-envelope` `{ method: "recovery_phrase" }` | `unlock-envelope` or `unlock-with-recovery-code` |

## Setup invariant

`vaultService.setup` rejects LTG setup unless envelopes include **both** `password` and `recovery_phrase`.  
`ltgSetupComplete` in status requires `vault-v2`, both envelopes, encrypted settings, and encrypted index.

A configured vault **cannot** be complete without a `recovery_phrase` envelope.

## `/vault/recovery` by vault status

| Client status | Behavior |
|---------------|----------|
| `not_configured` | Prompt → CTA `/vault/setup` |
| `setup_incomplete` | Prompt → CTA `/vault/setup` |
| `locked` | Prompt → CTA `/vault/unlock` |
| `unlocked` | Recovery phrase status (dates, length) + **Replace recovery phrase** + passkey setup |

No "Do this later" or initial phrase generation on this page — phrase is created at setup.

## Recovery phrase replacement

**Client (`useReplaceRecoveryPhrase`):**

1. Requires authenticated session + unlocked vault (UVK in memory).
2. User picks 12 or 24 words; phrase generated client-side.
3. Show phrase once → confirm entry.
4. `wrapVaultKeyForRecoveryPhrase` → encrypted envelope.
5. `vaultApi.replaceRecoveryPhrase` — phrase/UVK never sent.

**Server (`vaultService.replaceRecoveryPhrase`):**

1. Transaction: revoke active `recovery_phrase` envelope.
2. Create new `recovery_phrase` envelope.
3. Audit: `recovery_phrase_replaced`.

Old phrase envelopes remain in DB with `revoked_at` set; they cannot unlock.

## Metadata (`createdAt` / `replacedAt`)

`GET /api/vault/status` includes `recoveryPhrase`:

- `createdAt` — first `recovery_phrase` envelope ever created (original setup).
- `replacedAt` — active envelope `createdAt` when at least one prior phrase was revoked.
- `phraseLength` — from envelope `publicMetadata` when present.

## Gaps closed

- [x] Wrong terminology on `/vault/recovery` (recovery code, private letters, postpone).
- [x] Missing status gating (redirected to unlock without context for other states).
- [x] No replacement flow for recovery phrase.
- [x] Settings page linked to "Legacy recovery" copy.

## Remaining / intentional

- `POST /api/recovery-code` retained for legacy vaults and tests — not exposed in LTG recovery UI.
- Legacy `recovery_code` unlock remains on `/vault/unlock` for migrated users.
- Passkey setup unchanged (already required vault unlocked).

## Related docs

- `docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`
- `docs/TDR_LTG_Vault_MVP.md`
- `docs/API_REFERENCE.md`
