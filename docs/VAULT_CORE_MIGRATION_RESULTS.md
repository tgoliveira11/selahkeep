# SelahKeep — vault-core migration results

**Update:** `@tgoliveira/vault-core@0.1.1` → `0.2.0`  
**Date:** 2026-06-16

## Code changes

- Dependency bumped to `^0.2.0` (lockfile `0.2.0`).
- Envelope unlock wrappers pass `expectedScope` + `SELAHKEEP_VAULT_PROFILE` to vault-core 0.2.0 APIs.
- `legacy-envelope-unlock.ts` retained for envelopes without profile `aad.context`.
- No database or API contract changes.
- `@tgoliveira/secure-auth` untouched.

## APIs changed (app wrappers)

| Wrapper | Change |
| --- | --- |
| `unwrapVaultKeyFromPassword` | Core path: `unlockWithPasswordEnvelope(..., scope, profile)` |
| `unwrapVaultKeyFromRecoveryPhrase` | Core path: `unlockWithRecoveryEnvelope(..., scope, profile, options)` |
| `unwrapVaultKeyFromPasskey` / `unlockVaultFromPasskeyEnvelope` | Core path: scope + profile on unwrap/unlock |

## Compatibility fixtures

| Fixture | Result |
| --- | --- |
| Legacy password envelope (context stripped) | Pass — `legacy-envelope-unlock.test.ts` |
| Password unlock after manual lock → session | Pass — `legacy-vault-envelope-unlock.test.ts` |
| Wrong password on legacy envelope | Pass |
| Profile-tagged new envelopes | Pass via vault-core create + unlock with scope/profile |

## Session boundary

- Single store: `src/lib/crypto-client/vault-session.ts`
- Browser entry: only `vault-passkey-browser.ts`
- Boundary tests: `vault-session-single-source.test.ts`, `vault-core-boundaries.test.ts`

## Security checklist

All items in assessment §9 remain satisfied. Account login does not unlock vault. No secrets sent to server.

## Validation commands

| Command | Result |
| --- | --- |
| `npm run lint` | Pass (0 errors, pre-existing warnings) |
| `npm run test` | Pass |
| `npm run test:coverage` | Pass — statements 90.3%, branches 82.91%, functions 90.58%, lines 90.3% |
| `npm run build` | Pass |
| `npm run dev` | Port 3001 already in use (existing dev instance); build typecheck sufficient |

## Manual verification (staging)

- [ ] Fresh account, password-only vault setup
- [ ] Manual lock → password unlock → UI unlocked / Vault Status Dock open
- [ ] Recovery phrase unlock
- [ ] Passkey PRF unlock (if configured)
- [ ] Notes create/edit/read
- [ ] Account login alone does not unlock vault

## Rollback

See `VAULT_CORE_0_2_0_UPDATE_ASSESSMENT.md` §12.
