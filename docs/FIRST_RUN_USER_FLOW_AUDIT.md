# First-run user flow audit — SelahKeep

**Status:** Active  
**Product:** SelahKeep MVP  
**Related:** `docs/TDR_LTG_Vault_MVP.md`, `src/lib/vault/vault-status.ts`

## Vault status model

| Status | Meaning |
|--------|---------|
| `not_configured` | Signed in, no vault record |
| `setup_incomplete` | Vault record exists but required setup pieces are missing |
| `locked` | Setup complete, User Vault Key not in browser session |
| `unlocked` | Setup complete, UVK available in session |

**Account authentication** (secure-auth) is separate from **vault setup/unlock** (SelahKeep).

## Scenario A — Email/password account, no vault

| Field | Expected |
|-------|----------|
| Entry route | `/notes` (post-login) |
| Header badge | Vault not set up |
| Header CTA | Set up vault → `/vault/setup` |
| `/notes` | Welcome to SelahKeep + setup CTA |
| `/vault/unlock` | Setup-first screen (no password/recovery forms) |
| `/vault/settings` | Setup-first screen |
| Blocked | Unlock vault, notes list/editor, vault settings |
| Tests | `vault-status-ui.test.tsx` (nav, notes, unlock, settings) |

## Scenario B — OAuth account, no vault

Same as Scenario A. OAuth does not create a vault.

## Scenario C — Passkey account, no vault

Same as Scenario A. Account passkey sign-in does not imply vault unlock.

## Scenario D — Setup started, not completed

| Field | Expected |
|-------|----------|
| Header badge | Vault setup incomplete |
| Header CTA | Continue setup → `/vault/setup` |
| `/notes` | Complete setup prompt |
| `/vault/unlock` | Continue setup (no unlock methods) |
| `/vault/settings` | Complete setup prompt |
| Blocked | Unlock methods until setup is complete |

## Scenario E — Vault complete, locked

| Field | Expected |
|-------|----------|
| Header badge | Vault locked |
| Header CTA | Unlock vault → `/vault/unlock` |
| `/notes` | Unlock prompt |
| `/vault/unlock` | Password / recovery phrase / passkey (if configured) |
| `/vault/settings` | Unlock prompt |
| Available | Unlock flows matching `availableUnlockMethods` from status API |

## Scenario F — Vault complete, unlocked

| Field | Expected |
|-------|----------|
| Header badge | Vault unlocked |
| Header action | Lock vault |
| `/notes` | Notes list and filters |
| `/vault/settings` | Unlock behavior settings |
| `/vault/unlock` | Already unlocked message → Go to notes |

## Source of truth

- API: `GET /api/vault/status` → `hasVault`, `setupPhase`, `setupComplete`, `availableUnlockMethods`
- Client: `useVaultClientStatus()` + `deriveClientStatusFromServer()`
- Copy/helpers: `src/lib/vault/vault-status.ts`

## `/notes` as logged-in home

For users without a vault, `/notes` is the logged-in home that explains SelahKeep and routes to `/vault/setup`.

## `/vault/setup` as first configuration route

All setup-first CTAs point to `/vault/setup` until the vault is complete.
