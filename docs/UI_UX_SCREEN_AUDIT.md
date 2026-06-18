# SelahKeep — UI/UX Screen Audit

> Audit date: 2026-06-16. Guide: [`UI_UX_DIRECTION.md`](./UI_UX_DIRECTION.md).

| Route | Status | Notes |
|-------|--------|-------|
| `/` | pass | SelahKeep marketing copy; calm hero |
| `/login` | pass | `@tgoliveira/secure-auth` wrapper; no old branding |
| `/register` | pass | Same auth package shell |
| `/auth/*` | pass | Package-owned flows; app layout only |
| `/notes` | pass | Search includes body after unlock; Recently viewed chip; client-only query |
| `/notes/new` | pass | Template-first field order; vault locked write state |
| `/notes/[id]` | fixed | Redesigned as Note Reading View (Edit + More actions, reading surface) |
| `/vault/setup` | pass | Step flow; SelahKeep copy |
| `/vault/unlock` | pass | Password / phrase / legacy code unlock only |
| `/vault/settings` | pass | Settings sections pattern |
| `/vault/security` | pass | Locked variant; security review sections |
| `/vault/recovery` | pass | Recovery phrase primary; legacy code noted when present |
| `/settings/account` | pass | Account vs vault separation |
| Unknown route (`not-found`) | fixed | Custom SelahKeep 404; calm copy; session-aware recovery |
| Missing `/notes/[id]` | fixed | Generic note-not-found; no private metadata leak |

## Error / loading / empty

| Surface | Status | Notes |
|---------|--------|-------|
| Notes empty state | pass | Calm CTA to first note |
| Notes locked | pass | `VaultLockedState` notes-list |
| Note detail locked | fixed | No decrypted metadata; unlock actions |
| Global / note not-found | fixed | `NotFoundState`; no stack traces or private data |
| Vault not configured prompts | pass | Dock + settings links |

## Follow-up (non-blocking)

- `/vault/unlock` and `vault-unlock-panel` still expose **legacy recovery unlock** path where envelopes exist — intentional; not primary copy on notes surfaces.
- `ltg-vault-unlock-panel.tsx` filename is internal; user-visible strings reviewed separately.

## Checks applied

1. SelahKeep terminology in active UI
2. Consistent authenticated width tokens
3. Page Header where applicable
4. Progressive disclosure for secondary actions
5. Destructive actions not overexposed
6. No duplicated headings in settings
7. Not admin-panel aesthetic on notes flows
8. Locked states clear and safe
9. No deprecated product branding or removed features in active product UI
10. No decrypted content while vault locked on note routes
