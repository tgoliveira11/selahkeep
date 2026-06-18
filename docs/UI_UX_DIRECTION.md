# SelahKeep — UI/UX Direction

> Former working name: LTG Vault. Current product name: SelahKeep.

| Field | Value |
|-------|--------|
| **Product name** | SelahKeep |
| **Subtitle** | A private encrypted space for prayers, reflections, and notes |
| **Primary color** | **Purple** (resolved) |
| **Status** | Phase 5 hardening complete; SelahKeep rebrand applied |

---

## 1. Visual tone

SelahKeep should feel:

- **Calm** — no urgency, no clutter
- **Private** — trust and discretion over flash
- **Warm** — soft neutrals, human copy
- **Reflective** — space for prayer, reflection, and journaling
- **Spiritual without being heavy-handed** — gentle, not preachy
- **Mobile-first** — touch targets, readable type, single-column flows

Avoid crypto jargon in user-facing copy. Prefer “vault password,” “recovery phrase,” and “private notes.”

---

## 2. Primary color: purple

**Decision:** SelahKeep primary brand color is **purple**.

Use a **calm, elegant** palette — not neon or saturated violet.

### Token guidance (`src/app/globals.css`)

| Token | Role | Example |
|-------|------|---------|
| `--primary` | Primary CTA, links, focus ring | Deep royal purple `#5b3a8c` |
| `--primary-hover` | Hover state | `#4a2f73` |
| `--background` | Page background | Warm neutral with soft lavender tint `#faf8fc` |
| `--accent` | Secondary emphasis | Muted violet `#8b6bb8` |
| `--accent-muted` | Chips, subtle fills | Soft lilac `#ebe4f4` |
| `--card` / `--card-muted` | Surfaces | White / warm gray-lavender |

**Semantic colors stay semantic** — danger (red), success (green), warning (amber), info (blue). Do not use purple for error/success states.

**Accessibility:** Maintain WCAG AA contrast for body text and primary buttons on card backgrounds.

---

## 3. Auth package integration

Account auth UI comes from `@tgoliveira/secure-auth/react`. Style integration points:

- `SecureAuthProviders` + `secureAuthUiPublicConfig` in root layout
- App-owned wrappers: `(auth)/layout.tsx`, copy overrides via env config
- **Pending 2FA:** site header shows pre-auth chrome (Sign in / Create account), not logged-in nav or vault dock — see `src/lib/auth/session-state.ts` and [`TWO_FACTOR_MOBILE_FLOW_AUDIT.md`](./TWO_FACTOR_MOBILE_FLOW_AUDIT.md)
- **Do not** fork or patch package internals
- App purple tokens apply to app shell (nav, vault pages, marketing); package auth pages inherit base layout background where wrapped

---

## 4. Vault flows (Phase 1)

### `/vault/setup`

- Purple primary CTA on each step
- Step 1: Explain account sign-in vs vault password vs recovery phrase
- Step 2: Vault password + confirmation via `PasswordSetupFields` (`@tgoliveira/secure-auth`) with app-owned `VAULT_PASSWORD_*` policy
- Step 3: Choose 12 or 24 recovery words
- Step 4: Show phrase once (copy affordance)
- Step 5: Confirm phrase
- Privacy notice: secrets never leave the device

### `/vault/settings` and `/vault/security`

- **Settings:** unlock behavior, passkey vault unlock management, recovery link, import/export limitation notice
- **Security review (`/vault/security`):** vault health summary, protection status, local recovery phrase test (no server phrase transmission), passkey PRF compatibility, safe security event log, account/vault separation reminder

### `/vault/unlock`

- Purple primary unlock button
- Tabs or sections: vault password | recovery phrase | legacy recovery code (unlock only) where applicable
- `/vault/recovery` (unlocked): recovery phrase status + **Replace recovery phrase** — optional link to `/vault/settings` for passkey vault unlock (no primary passkey CTA here)
- Calm error messages (“That password didn’t unlock your vault”)
- Legacy `vault-v1` users: recovery code / passkey paths preserved where envelopes exist; trusted devices removed (`docs/TRUSTED_DEVICES_REMOVAL.md`)

### Navigation

See [`LOGGED_IN_NAVIGATION_AUDIT.md`](./LOGGED_IN_NAVIGATION_AUDIT.md).

- **Primary (signed in):** Notes · Vault · Account · Sign out (no vault lock/status in header)
- **Pending 2FA:** same pre-auth header as signed-out users on `/login/2fa` (no Notes/Vault/Account/Sign out/dock)
- **Global vault status dock:** narrow compact popover on authenticated header; quick password/passkey unlock; recovery phrase on `/vault/unlock` only; dock stays collapsed on `/vault/unlock`
- **Route scroll:** authenticated navigations reset to page top unless a hash anchor is present (`RouteScrollToTop` in `SiteShell`)
- **`/notes` locked state:** `VaultLockedState` (`notes-list`) with **Unlock here** + **Open full unlock page**; no decrypted notes while locked
- **`/notes/new` locked:** `VaultLockedState` (`write`) — “Unlock to write” or “Vault closed while writing” after auto-lock; no `VaultUnlockPanel` / recovery summary
- **`/notes/[id]` locked:** `VaultLockedState` (`read-note` or `write` when editing)
- **`/vault/settings` / `/vault/security` locked:** context-specific `VaultLockedState` variants
- **Brand mark:** Purple SK monogram in header and favicon (no green envelope)
- **Account vs vault:** `/settings/account` = sign-in security; `/vault/*` = note encryption protection
- Footer attribution unchanged

### Vault status prompts

| Status | `/vault/settings` | `/notes` |
|--------|-------------------|----------|
| `not_configured` | Set up your vault → `/vault/setup` | Same |
| `setup_incomplete` | Complete your vault setup → `/vault/setup` | Same |
| `locked` | Unlock via dock inline or `/vault/unlock` | Same |
| `unlocked` | Unlock behavior settings | Notes list + sort/counter/filters; dock shows open state + auto-lock countdown |

### `/notes`, `/notes/new`, `/notes/[id]`

- **Page header:** title + human subtitle + primary **New note ▾** menu (blank, daily, core templates).
- **Controls toolbar:** compact card with search, **Views ▾**, **Filters ▾**, **Sort ▾**, Cards/List; smart filter chips below; note count integrated — not a form-heavy panel.
- **Progressive disclosure:** saved views and advanced category/tag/status filters live in menus, not large always-visible blocks.
- **Smart filter chips** on `/notes` (All active, Pinned, Favorites, Resolved, Unresolved, Archived, Trash) — client-only after unlock.
- **Saved views** — encrypted in vault index; save/apply/delete via **Views ▾** menu on `/notes`.
- **View mode** — Cards (rich metadata cards) / List (compact scan rows); preference in `localStorage` (`selahkeep:notes:view-mode`, non-sensitive).
- **Controls visibility:** entire toolbar hidden when zero notes and no organizers/saved views/active filters; shown for one or more notes.
- **Vault status dock** (`VaultStatusDock` inside authenticated `Nav` header): collapsed = tiny centered handle (`Vault` or `mm:ss` + chevron); expanded locked = quick password/passkey unlock + **Open full unlock page**; expanded open = compact row with **Lock now**. Recovery phrase only on `/vault/unlock`. Top nav shows only Notes, Vault, Account, Sign out.
- **New note:** title required; category dropdown only when categories exist; non-blank templates assign a **locked category** matching the template name; template can be chosen from header menu (`/notes/new?template=…`) or picker on create screen. Autosave starts only after user edits, not template prefill.
- **Tags:** chip input with normalization; display `#tag`, store `tag` (max 32 chars).
- **Detail:** title row with resolved/unresolved badge + resolve icon (same as list); category pill without `#`; tag chips with `#`; created + updated dates; interactive checklist toggles in view/edit preview (persist on view via encrypted update).
- **List:** compact rows with resolve marker, title, category/tags, updated date; quick resolve action does not navigate.
- **Cards:** richer cards with badges, metadata, comfortable spacing; resolved notes subtly distinct without washed-out text.
- **Empty state:** “Start your first private note” with calm copy and New note action.
- **Detail lifecycle:** Pin, Favorite, Archive, Move to trash, Restore, Delete permanently (confirmation), Duplicate note.
- **Resolved:** user-facing label; internal encrypted metadata uses `answered`.
- **Markdown:** interactive checklists in preview (toggle `[ ]` ↔ `[x]` in source only), shortcuts, sanitized `MarkdownPreview`.
- **Drafts:** encrypted local autosave; restore/discard on return.
- **Templates:** chip-style picker on `/notes/new`; confirms before replacing existing body.

---

## SelahKeep Authenticated UI Patterns

Apply these patterns across authenticated screens (`/notes`, `/vault/settings`, `/vault/security`, `/settings/account`, and future app surfaces).

**Core principle:** show essential controls by default; hide advanced controls behind progressive disclosure; keep the page focused on the user’s current task.

### Page Header Pattern

Every authenticated screen should use `PageHeader`:

```text
Title                                      Primary action
Short description / context
```

Example on `/notes`:

```text
Notes                                      [New note ▾]
Your encrypted space for prayers, reflections, and private notes.
```

Rules:

1. Title is strong and clear.
2. Subtitle is short and human.
3. Primary action appears in the header when relevant.
4. Avoid duplicated headings inside nested cards.
5. Use consistent max-width and spacing via `AuthenticatedPage` / `PageLayout` width tokens.

### Primary Action Pattern

Prefer one primary action. On `/notes`, use **New note** with a menu chevron (SVG, not Unicode ▾) for: Blank note, Daily note, Prayer, Reflection, Gratitude, Decision, Checklist, Journal.

**Button copy rule:** toolbar and action labels do not end with periods (`Views`, not `Views.`).

### Compact Controls Region Pattern

Search, sort, view mode, note count, and saved views live in one cohesive toolbar shell (`NotesListControls`):

- **Desktop row 1:** search + compact icon toolbar buttons (Views, Filters, Sort, Cards/List)
- **Row 2:** smart filter chips + integrated note count

Toolbar buttons use `ToolbarButton` with inline SVG icons (`toolbar-icons.tsx`).

### Progressive Disclosure Pattern

- Saved views → **Views** menu (`SavedViewsMenu`)
- Category/tag/status → **Filters** menu (`AdvancedFiltersMenu`)
- Sort → **Sort** menu (`SortControl`)

### Smart Filter Chips Pattern

Primary lifecycle filters render as spaced pill chips (`SmartFilterChips`) with `gap`, selected state, and horizontal scroll on mobile. Chips must never concatenate visually.

### Card/List View Pattern

- **Cards** (`NoteCard`): category, tags, state indicators (resolved, pinned, favorite), comfortable spacing.
- **List** (`NotesListGrid` + `NoteListRow`): column header + aligned rows (status, title, category, updated, state indicators, resolve action) — not raw text lines.
- **List mode shows category only** — tags are hidden in list rows for scanability; tags remain visible in card mode.

### Toolbar layering and sizing

Toolbar dropdowns (`ToolbarMenu` for Views, Filters, Sort) **portal to `document.body`** with class `toolbar-menu-panel` and z-index token `--z-toolbar-popover` (40), above note cards/list rows but below the vault dock/header shell.

The controls shell (`.notes-list-controls__shell`) must **not** use `overflow: hidden` — menus must not clip.

All toolbar controls share height via `--toolbar-control-height` (2.5rem / 40px):

- `ToolbarButton` (Views, Filters, Sort)
- `ViewModeToggle` (Cards/List)

### Note state indicators

Shared component: `NoteStateIndicators` (`@/components/notes/note-state-indicators`) with inline SVG icons (`note-state-icons.tsx`).

| State | Indicator | Accessible label |
|-------|-----------|------------------|
| Resolved | check circle | `Resolved` |
| Unresolved | empty circle | `Unresolved` |
| Pinned | pin icon | `Pinned note` |
| Favorite | star icon | `Favorite note` |
| Archived | archive icon | `Archived note` |
| Trash | trash icon | `Note in trash` |

Rules:

- **Card mode:** resolved/unresolved icon in indicator cluster; pinned/favorite when active.
- **List mode:** resolved/unresolved in status column (○/✓); pin/favorite/archive/trash in separate States column.
- Pinned/favorite are **not shown** when a note is archived or trashed.
- Archived/trash indicators appear when viewing those filters/views.

### Settings Section Pattern

Account and vault settings use `SettingsSection` cards — one section per topic. Avoid nesting a page title inside an outer card. Use `suppressPackageHeading` when embedding `@tgoliveira/secure-auth` pages that ship their own heading.

### Empty/Locked State Pattern

`EmptyState` and `VaultLockedState` explain what happened, why it matters, and the next step. Avoid blank pages.

### Width and Rhythm Pattern

| Surface | Width token | Max width |
|---------|-------------|-----------|
| Settings / account / vault management | `settings` | 800px |
| Notes list dashboard | `notes` | 920px |
| Note editor (`/notes/new`, edit) | `editor` | 880px |
| Marketing | `marketing` | ~896px |
| Narrow flows (unlock) | `narrow` | ~448px |

Use `AuthenticatedPage` from `@/components/layout/authenticated-page` for standard authenticated routes.

### Reusable components

| Component | Location |
|-----------|----------|
| `AuthenticatedPage` | `@/components/layout/authenticated-page` |
| `PageHeader` | `@/components/ui/page-header` |
| `PageLayout` | `@/components/layout/page-layout` |
| `ToolbarButton` / `ToolbarMenu` | `@/components/ui/toolbar-button`, `toolbar-menu` |
| `ToolbarIcons` | `@/components/ui/toolbar-icons` |
| `SettingsSection` | `@/components/ui/settings-section` |
| `NewNoteAction` | `@/features/notes/new-note-action` |
| `NotesListControls` | `@/features/notes/notes-list-controls` |
| `SmartFilterChips` | `@/features/notes/smart-filter-chips` |
| `SavedViewsMenu` | `@/features/notes/saved-views-menu` |
| `AdvancedFiltersMenu` | `@/features/notes/advanced-filters-menu` |
| `SortControl` | `@/features/notes/sort-control` |
| `ViewModeToggle` | `@/features/notes/view-mode-toggle` |
| `NotesListGrid` | `@/components/notes/notes-list-grid` |
| `EmptyState` | `@/components/ui/empty-state` |
| `NoteCard` / `NoteListRow` | `@/components/notes/*` |
| `NoteStateIndicators` | `@/components/notes/note-state-indicators` |


## 5. Phase scope

**In Phase 1:** tokens, vault setup/unlock, light marketing copy toward “vault” language.

**Track 3 (complete):** pin, favorite, archive, trash/restore/permanent delete, smart local filters, encrypted saved views, cards/list view, duplicate note. `/notes` list controls (search, sort, view, count) share one region with consistent visibility. See `docs/NOTE_ORGANIZATION_LIFECYCLE_TRACK_3_IMPLEMENTATION.md`.

**Phase 3 (complete):** notes list search/filters, category picker, tag chips, answered badge, `/vault/settings` unlock behavior (`metadata_only` vs `decrypt_all`).

**SelahKeep rebrand (complete):** product name, subtitle, purple SK monogram, calm reflective marketing copy.

---

## 6. References

- `docs/TDR_LTG_Vault_MVP.md` §3 Product Identity
- `src/app/globals.css` — design tokens
- `src/components/ui/*` — primitives using CSS variables
