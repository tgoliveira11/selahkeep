# SelahKeep — vault-core migration plan

**Current dependency:** `@tgoliveira/vault-core@0.2.0`  
**Profile:** `SELAHKEEP_VAULT_PROFILE` in `src/modules/vault/selahkeep-profile.ts`

## Phases (completed)

| Phase | Status | Notes |
| --- | --- | --- |
| A — Baseline tests | Done | Pre-migration suite green on 0.1.1 |
| B — Add dependency + profile | Done | `selahkeep-profile.ts` |
| C — Compatibility fixtures / legacy path | Done | `legacy-envelope-unlock.ts` + tests |
| D — Crypto helpers via vault-core | Done | Envelopes, UVK, recovery re-exports |
| E — Session boundary | Done | `vault-session.ts` single source; PRF via `vault-passkey-browser.ts` |
| F — 0.2.0 upgrade | Done | Scope + profile on unlock APIs (see `VAULT_CORE_0_2_0_UPDATE_ASSESSMENT.md`) |

## Out of scope (unchanged)

- Note encryption (`src/lib/crypto-client/notes.ts`)
- Vault index/settings schemas
- API routes and database
- `@tgoliveira/secure-auth`
- Legacy `recovery-code.ts` (vault-v1)
- Trusted Devices

## Rollback

Revert package version and envelope wrapper changes; `npm ci`; full test + build.
