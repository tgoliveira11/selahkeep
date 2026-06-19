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
- **Smart filter chips** on `/notes` (All active, Pinned, Favorites, Recently viewed, Resolved, Unresolved, Archived, Trash) — client-only after unlock.
- **Saved views** — encrypted in vault index; save/apply/delete via **Views ▾** menu on `/notes`.
- **Reflective views** — **Remembrance** (`/notes/remembrance`), **Weekly reflection** (`/notes/weekly-reflection`), **Recently viewed** (smart filter) in **Views ▾** menu.
- **Resolved reflection** — optional calm dialog when marking resolved (What changed? / How resolved? / What to remember?); stored in encrypted metadata; displayed on detail when present.
- **Timeline** — progressive disclosure on `/notes/[id]` from encrypted lifecycle events (newest first).
- **Prompt cards** — static local prompts on `/notes/new` and weekly reflection; insert into editor only.
- **View mode** — Cards (rich metadata cards) / List (compact scan rows); preference in `localStorage` (`selahkeep:notes:view-mode`, non-sensitive).
- **Controls visibility:** entire toolbar hidden when zero notes and no organizers/saved views/active filters; shown for one or more notes.
- **Vault status dock** (`VaultStatusDock` inside authenticated `Nav` header): collapsed = tiny centered handle (`Vault` or `mm:ss` + chevron); expanded locked = quick password/passkey unlock + **Open full unlock page**; expanded open = compact row with **Lock now**. Recovery phrase only on `/vault/unlock`. Top nav shows only Notes, Vault, Account, Sign out.
- **New note field order:** Template → Category (blank note only) → Title → Editor → Tags → Save. Template is first; tags are last optional organization step.
- **New note:** title required; **blank note** shows manual category selection/creation (user-created categories only); non-blank templates hide manual category controls and show a read-only template-assigned category indicator; template category is created/reused **on save**, not on template selection. Reserved template names cannot be used for user-created categories. Autosave starts only after user edits, not template prefill.
- **Tags:** chip input with normalization; display `#tag`, store `tag` (max 32 chars).
- **Detail:** reading view (`NoteReadingView`) — back link, title row with **Edit** + **More actions** menu; fixed state indicators (pin → favorite → resolved); category pill without `#`; tag chips with `#`; created + updated dates; editorial reading surface (`note-reading-surface`); secondary lifecycle actions in menu; destructive trash inside menu only.
- **List:** compact rows with resolve marker, title, category/tags, updated date; quick resolve action does not navigate.
- **Cards:** richer cards with badges, metadata, comfortable spacing; resolved notes subtly distinct without washed-out text.
- **Empty state:** “Start your first private note” with calm copy and New note action.
- **Detail lifecycle:** Pin, Favorite, Archive, Duplicate in **More actions** menu; Move to trash (destructive, menu + confirmation); archived/trash detail banners; Restore / Delete permanently in trash context.
- **Resolved:** user-facing label; internal encrypted metadata uses `answered`.
- **Markdown:** interactive checklists in preview (toggle `[ ]` ↔ `[x]` in source only), shortcuts, sanitized `MarkdownPreview`.
- **Drafts:** encrypted local autosave; restore/discard on return.
- **Templates:** chip-style picker on `/notes/new`; switches apply immediately (no confirmation modal). If the user has edited, encrypted draft is flushed before the new template is applied. See [`NOTES_AUTOSAVE_AND_TEMPLATE_SWITCHING.md`](./NOTES_AUTOSAVE_AND_TEMPLATE_SWITCHING.md).

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
- **List** (`NotesListGrid` + `NoteListRow`): Title | Category | Updated | States (fixed pin → favorite → resolved slots) + resolve action — not raw text lines.
- **View mode:** defaults to **Cards**; preference stored in `localStorage` key `selahkeep:notes:view-mode` (`cards` | `list` only — no private metadata).
- **List mode shows category only** — tags are hidden in list rows for scanability; tags remain visible in card mode.

### Toolbar layering and sizing

Toolbar dropdowns (`ToolbarMenu` for Views, Filters, Sort) **portal to `document.body`** with class `toolbar-menu-panel` and z-index token `--z-toolbar-popover` (40), above note cards/list rows but below the vault dock/header shell.

The controls shell (`.notes-list-controls__shell`) must **not** use `overflow: hidden` — menus must not clip.

All toolbar controls share height via `--toolbar-control-height` (2.5rem / 40px):

- `ToolbarButton` (Views, Filters, Sort)
- `ViewModeToggle` (Cards/List)

### Note state indicators

Shared component: `NoteStateIndicators` with inline SVG icons. **Fixed order:** pinned → favorite → resolved/unresolved. Inactive pin/favorite slots stay aligned (muted/hidden). Archived/trash icons append after the core trio.

| State | Indicator | Accessible label |
|-------|-----------|------------------|
| Pinned | pin icon (slot 1) | `Pinned note` / `Not pinned` |
| Favorite | star icon (slot 2) | `Favorite note` / `Not favorite` |
| Resolved | check circle (slot 3) | `Resolved` |
| Unresolved | empty circle (slot 3) | `Unresolved` |
| Archived | archive icon (lifecycle) | `Archived note` |
| Trash | trash icon (lifecycle) | `Note in trash` |

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
| `NotFoundState` | `@/components/ui/not-found-state` |
| `AppNotFoundPage` | `@/components/layout/app-not-found` |
| `NoteCard` / `NoteListRow` | `@/components/notes/*` |
| `NoteStateIndicators` | `@/components/notes/note-state-indicators` |
| `NoteReadingView` | `@/components/notes/note-reading-view` |
| `NoteMoreActionsMenu` | `@/components/notes/note-more-actions-menu` |


### Controls Toolbar Pattern

Same as **Compact Controls Region Pattern** — search, Views, Filters, Sort, Cards/List in one toolbar shell. Dropdowns portal to `document.body` with `toolbar-menu-panel`.

### Note Card Pattern

`NoteCard`: title link, category, tags (card mode), metadata dates, fixed state indicators outside navigation link. Resolved notes subtly distinct without washed-out body text.

### Note List/Grid Pattern

Same as **Card/List View Pattern** — list rows show category only; indicators in fixed slots.

### Note Reading View Pattern

`/notes/[id]` is a **private document reading experience**, not a CRUD admin panel.

```text
← Back to notes

Title                                      [Edit] [More actions]
[Pin] [Favorite] [Resolved/Unresolved]
[Category] [#tags]
Created · Updated

[Reading surface — MarkdownPreview]
```

Rules:

1. **Edit** is the only always-visible secondary action besides the menu trigger.
2. Pin, favorite, archive, duplicate, and move to trash live in **More actions** (`NoteMoreActionsMenu`).
3. **Move to trash** is destructive styling inside the menu — never a large red page button on active notes.
4. State indicators use `NoteStateIndicators` with `interactive` toggles in fixed order: pinned → favorite → resolved/unresolved.
5. Resolved control is part of the indicator row — not a detached floating button.
6. Metadata: category badge (no `#`), tags with `#`, created/updated dates as secondary text.
7. Body uses `note-reading-surface` — comfortable width (editor token ~880px), soft border, readable typography.
8. **Archived:** calm banner + restore via menu; no archive action as primary.
9. **Trash:** banner + Restore note + Delete permanently (with confirmation); no normal edit/menu.
10. **Locked:** `VaultLockedState` (`read-note`) — no decrypted title, body, category, or tags.

### Destructive Action Pattern

1. Destructive actions are never the first or most prominent control unless on a dedicated confirmation screen.
2. **Move to trash** → More actions menu + calm confirmation: “You can restore this note from Trash later.”
3. **Delete permanently** → only in trash context + confirmation: “This will permanently delete this encrypted note. This action cannot be undone.”
4. Menu items use destructive text color (`--danger`).
5. Pages should not feel like admin panels — prioritize the user’s primary task (read, write, organize).

### Metadata Badge Pattern

| Type | Display | Example |
|------|---------|---------|
| Category | pill/badge, no hash prefix | `Pray` |
| Tag | chip with `#` prefix | `#faith` |
| Dates | muted secondary line | `Created Jun 17 · Updated Jun 18` |

Do not show plaintext metadata while vault is locked.

### State Indicator Pattern

Component: `NoteStateIndicators`. **Fixed slot order:** pinned (1) → favorite (2) → resolved/unresolved (3). Archived/trash append after without shifting slots.

| Slot | Active label | Inactive label |
|------|--------------|----------------|
| Pin | Pinned note | Not pinned |
| Favorite | Favorite note | Not favorite |
| Resolved | Mark as unresolved (interactive) / Resolved (display) | Mark as resolved |

On detail view, slots are buttons (`interactive` prop). Clicks must not navigate.

### Locked State Pattern

`VaultLockedState` explains what happened and what to do next:

- **Unlock here** — expands vault dock quick unlock when available.
- **Open full unlock page** — `/vault/unlock?returnTo=…`

No decrypted note content or metadata on locked `/notes/[id]`.

### Settings Page Pattern

Use `SettingsSection` — one topic per section. No nested duplicate page titles. Account (`/settings/account`) vs vault (`/vault/*`) separation.

### Empty State Pattern

`EmptyState` with calm copy and a single clear next action (e.g. “Start your first private note”).

### Not Found (404) Pattern

`src/app/not-found.tsx` renders `AppNotFoundPage` — calm SelahKeep empty-state, not a technical error screen.

| Context | Copy | Primary action |
|---------|------|----------------|
| Unknown route | Page not found — vault and notes are safe | Signed in: **Go to notes** · Signed out: **Go home** |
| Missing `/notes/[id]` | Note not found — generic; no private metadata | **Back to notes** |

Rules:

- Subtle `404` badge; title is human (“Page not found”), not “404 Error”.
- Missing private resources must **not** reveal whether a note ID existed or expose title/body/category/tags.
- Signed-out users: Home + Sign in; no Vault Status Dock or authenticated nav.
- Pending 2FA: same pre-auth recovery as signed-out (no authenticated shell).
- Fully signed in: Go to notes, Go home, optional Open vault settings.
- Route-specific: `src/app/(vault)/notes/[id]/not-found.tsx` and client 404 handling on note detail load.

### Width and Spacing System

| Surface | Token | Max width |
|---------|-------|-----------|
| Settings / account / vault | `settings` | 800px |
| Notes list | `notes` | 920px |
| Note editor + reading view | `editor` | 880px |
| Marketing | `marketing` | ~896px |
| Narrow (unlock) | `narrow` | ~448px |

Use `AuthenticatedPage` for authenticated routes. Avoid floating controls outside the content grid.

### Terminology (active UI)

Use **SelahKeep**, **private notes**, **recovery phrase**, **vault password**.

Do **not** use deprecated product branding, legacy domain language, or removed features in active UI.

---

## 5. Phase scope

**In Phase 1:** tokens, vault setup/unlock, light marketing copy toward “vault” language.

**Track 3 (complete):** pin, favorite, archive, trash/restore/permanent delete, smart local filters, encrypted saved views, cards/list view, duplicate note. `/notes` list controls (search, sort, view, count) share one region with consistent visibility.

**Phase 3 (complete):** notes list search/filters, category picker, tag chips, answered badge, `/vault/settings` unlock behavior (`metadata_only` vs `decrypt_all`).

**SelahKeep rebrand (complete):** product name, subtitle, purple SK monogram, calm reflective marketing copy.

---

## 6. References

- `docs/TDR_LTG_Vault_MVP.md` §3 Product Identity
- `src/app/globals.css` — design tokens
- `src/components/ui/*` — primitives using CSS variables
