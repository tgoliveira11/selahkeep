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
- **`/notes` locked state:** explanatory card with unlock actions; no decrypted notes, counts, or metadata while locked
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

- **Search/filters** on `/notes` appear only after at least one category or tag exists; helper copy when none exist.
- **Vault status dock** (`VaultStatusDock` inside authenticated `Nav` header): collapsed = tiny centered handle (`Vault` or `mm:ss` + chevron); expanded locked = quick password/passkey unlock + **Open full unlock page**; expanded open = compact row with **Lock now**. Recovery phrase only on `/vault/unlock`. Top nav shows only Notes, Vault, Account, Sign out.
- **New note:** title required; category dropdown only when categories exist; no resolved toggle on create. **Visual editor** default in a unified editor card (grouped toolbar, `+ Insert` quick menu, writing canvas, status bar); discreet **Markdown** toggle for source mode. **14 templates**, **focus mode**, **daily note** action, encrypted local drafts with restore/discard.
- **Tags:** chip input with normalization; display `#tag`, store `tag` (max 32 chars).
- **Detail:** title row with resolved/unresolved badge + resolve icon (same as list); category pill without `#`; tag chips with `#`; created + updated dates; interactive checklist toggles in view/edit preview (persist on view via encrypted update).
- **List:** resolve/unresolve icon button per card (`stopPropagation`, does not navigate); resolved/unresolved badges; created + updated dates (`text-xs`); sort + filtered note counter.
- **Resolved:** user-facing label; internal encrypted metadata uses `answered`.
- **Markdown:** interactive checklists in preview (toggle `[ ]` ↔ `[x]` in source only), shortcuts, sanitized `MarkdownPreview`.
- **Drafts:** encrypted local autosave; restore/discard on return.
- **Templates:** chip-style picker on `/notes/new`; confirms before replacing existing body.

---

## 5. Phase scope

**In Phase 1:** tokens, vault setup/unlock, light marketing copy toward “vault” language.

**Phase 3 (complete):** notes list search/filters, category picker, tag chips, answered badge, `/vault/settings` unlock behavior (`metadata_only` vs `decrypt_all`).

**SelahKeep rebrand (complete):** product name, subtitle, purple SK monogram, calm reflective marketing copy.

---

## 6. References

- `docs/TDR_LTG_Vault_MVP.md` §3 Product Identity
- `src/app/globals.css` — design tokens
- `src/components/ui/*` — primitives using CSS variables
