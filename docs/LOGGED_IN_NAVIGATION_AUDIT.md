# Logged-in Navigation Audit

Last updated: 2026-06-16

This document audits LTG Vault logged-in navigation after Phases 0–5 and records the navigation/favicon changes from the focused nav audit.

## Summary

| Area | Decision |
|------|----------|
| Primary workspace | **Notes** (`/notes`) |
| Vault protection | **Vault** (`/vault/settings`) + conditional **Unlock vault** |
| Account authentication | **Account** (`/settings/account`) — package-owned security UI |
| Removed from primary nav | `Write`, `Devices`, `Recovery`, `My notes` label |
| Legacy vault routes | Linked from Vault settings (not primary nav) |
| Favicon / header mark | Purple **LTG** monogram — green envelope removed |

---

## Navigation inventory

| Current label | Route | Icon | Signed out | Signed in | Vault locked | Vault unlocked | Purpose | Action | Reason |
|---------------|-------|------|------------|-----------|--------------|----------------|---------|--------|--------|
| LTG Vault (brand) | `/` or `/notes` | AppMark | Yes | Yes | Yes | Yes | Product home | **Keep** | Consistent branding |
| Notes | `/notes` | — | No | Yes | Yes* | Yes | Main workspace | **Keep / rename** | Primary workspace; was "My notes" |
| Write | `/notes/new` | — | No | Was yes | — | — | Quick compose | **Remove** | Notes page has create CTA; reduces clutter |
| Vault | `/vault/settings` | — | No | Yes | Yes | Yes | Vault behavior, legacy links | **Keep** | Vault protection settings |
| Devices | `/vault/devices` | — | No | Was yes | Yes | Yes | Legacy trusted devices | **Move** | Legacy; link from Vault settings |
| Recovery | `/vault/recovery` | — | No | Was yes | Yes | Yes | Legacy recovery code | **Move** | Legacy; link from Vault settings |
| Account | `/settings/account` | — | No | Yes | Yes | Yes | Auth, passkeys, 2FA, sessions | **Keep** | Package account security |
| Unlock vault | `/vault/unlock` | — | No | When locked | Yes | No | Unlock flow | **Keep (conditional)** | Only when vault locked |
| Lock vault | (action) | — | No | When unlocked | No | Yes | Lock in-memory vault | **Keep (conditional)** | Does not sign out |
| Sign out | (action) | — | No | Yes | Yes | Yes | End account session | **Keep** | Locks vault first |
| Vault status badge | — | — | No | Yes | Locked | Unlocked | State indicator | **Keep** | Clear vault vs account distinction |

\*Notes list is visible when signed in but decrypted content requires vault unlock (existing gate).

### Routes not in primary nav (by design)

| Route | Visible when | Purpose | Nav treatment |
|-------|--------------|---------|---------------|
| `/vault/setup` | Vault not initialized | First-time vault setup | Redirect from product pages; not a menu item |
| `/vault/unlock` | Vault locked | Unlock | Conditional link + direct URL |
| `/notes/new` | Signed in | Create note | From Notes page CTA |
| `/notes/[id]` | Signed in | Edit note | From Notes list |
| `/login`, `/register` | Signed out | Account auth | Public header only |

---

## Specific menu questions

1. **Main menu: Notes, Vault, or both?** — **Both.** Notes is the workspace; Vault is protection/settings.
2. **Vault Setup after vault exists?** — **No primary nav item.** `useRequireVault` redirects to setup when needed.
3. **Vault Unlock when already unlocked?** — **No.** Shown only when vault is locked.
4. **Recovery phrase under Vault or Account?** — **Vault domain** (setup during `/vault/setup`). Account page links to Vault settings; legacy recovery code under Vault settings advanced section.
5. **Passkey vault unlock under Vault vs account passkeys under Account?** — **Yes.** Passkey vault unlock setup lives in Account security (`PasskeyVaultUnlockSetup`); account passkeys remain package-owned on the same page.
6. **TOTP only under account security?** — **Yes.** Package `SecuritySettingsPage`.
7. **Sessions only under account security?** — **Yes.** Package account settings.
8. **Account deletion under account settings?** — **Yes.** With vault deletion warning.
9. **Missing from nav?** — Nothing essential; legacy Devices/Recovery moved to Vault settings.
10. **Should not be visible?** — `Write`, top-level `Devices`, top-level `Recovery`, any `Letters` link.
11. **Mobile vs desktop consistent?** — **Yes.** Same three primary links; mobile groups Workspace / Vault protection / Account security.
12. **Old letter or green envelope identity?** — **Removed.** Header `AppMark` and `icon.svg` now use purple LTG monogram.

---

## Final logged-in navigation structure

### Desktop (signed in)

```text
[LTG Vault]   Notes | Vault | Account | [Unlock vault?]   [Lock vault?] Sign out [Badge]
```

### Mobile (signed in)

```text
Menu →
  Workspace: Notes, [Unlock vault?]
  Vault protection: Vault, [Lock vault?]
  Account security: Account
  Sign out + vault status
```

### Visibility rules

| Element | Rule |
|---------|------|
| Notes, Vault, Account | Always when signed in |
| Unlock vault | Signed in && vault locked |
| Lock vault | Signed in && vault unlocked |
| Sign out | Always when signed in |
| Vault badge | Always when signed in |

---

## Account security vs vault protection

| Concern | Where | Examples |
|---------|-------|----------|
| **Account security** (who can sign in) | `/settings/account` | Email, password, OAuth, account passkeys, TOTP, sessions, account deletion |
| **Vault protection** (who can decrypt notes) | `/vault/settings`, `/vault/unlock`, `/vault/setup` | Vault password, recovery phrase, unlock behavior, inactivity lock, legacy devices |

Account session does **not** unlock the vault. Navigation copy and grouping reinforce this split.

---

## Favicon / app icon decision

**Chosen:** Option B — purple **LTG** monogram in a rounded square (`#5b3a8c`).

**Removed:** Green sage envelope (`#4a6741`) from `AppMark` component.

**Files:**

- `src/app/icon.svg`
- `src/modules/ui/lib/brand-mark.ts`
- `src/modules/ui/primitives/app-mark.tsx` (renders shared `BRAND_MARK_SVG`)

**Metadata:** `src/app/layout.tsx` — title `LTG Vault`, description from `PRODUCT_TAGLINE`, `themeColor: #5b3a8c`.

---

## Implementation reference

- Nav config: `src/lib/navigation/logged-in-nav.ts`
- Nav UI: `src/components/layout/nav.tsx`
- Tests: `src/test/features/logged-in-navigation.test.tsx`, `src/test/unit/app-mark.test.ts`
