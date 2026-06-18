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

### `/vault/unlock`

- Purple primary unlock button
- Tabs or sections: vault password | recovery phrase | legacy recovery code (unlock only) where applicable
- `/vault/recovery` (unlocked): recovery phrase status + **Replace recovery phrase** + passkey setup — no "Generate recovery code" or "Do this later"
- Calm error messages (“That password didn’t unlock your vault”)
- Legacy `vault-v1` users: recovery code / passkey paths preserved where envelopes exist; trusted devices removed (`docs/TRUSTED_DEVICES_REMOVAL.md`)

### Navigation

See [`LOGGED_IN_NAVIGATION_AUDIT.md`](./LOGGED_IN_NAVIGATION_AUDIT.md).

- **Primary (signed in):** Notes · Vault · Account
- **Conditional vault action:** Set up vault / Continue setup / Unlock vault / Lock vault — driven by vault client status
- **Brand mark:** Purple SK monogram in header and favicon (no green envelope)
- **Account vs vault:** `/settings/account` = sign-in security; `/vault/*` = note encryption protection
- Footer attribution unchanged; vault status badge in header (`Vault not set up`, `Setup incomplete`, `Vault locked`, `Vault unlocked`)

### Vault status prompts

| Status | `/vault/settings` | `/notes` |
|--------|-------------------|----------|
| `not_configured` | Set up your vault → `/vault/setup` | Same |
| `setup_incomplete` | Complete your vault setup → `/vault/setup` | Same |
| `locked` | Unlock your vault → `/vault/unlock` | Same |
| `unlocked` | Unlock behavior settings | Notes list + filters (when categories/tags exist); vault open indicator |

### `/notes`, `/notes/new`, `/notes/[id]`

- **Search/filters** on `/notes` appear only after at least one category or tag exists; helper copy when none exist.
- **Vault indicator** on `/notes`: closed visual + unlock CTA when locked; open visual + **Lock vault** when unlocked.
- **New note:** title required; category dropdown only when categories exist; no answered toggle on create.
- **Tags:** chip input with normalization; display `#tag`, store `tag` (max 32 chars).
- **Detail:** category pill without `#`; tag chips with `#`; answered toggle in edit mode only.
- **Resolved:** user-facing label; internal encrypted metadata uses `answered`.
- **Markdown:** checklists (read-only in preview), shortcuts, sanitized `MarkdownPreview`.
- **Drafts:** encrypted local autosave; restore/discard on return.
- **Templates:** client-side starter Markdown on `/notes/new` only.

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
