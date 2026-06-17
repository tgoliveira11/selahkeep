# LTG Vault — UI/UX Direction

| Field | Value |
|-------|--------|
| **Product name** | LTG Vault |
| **Subtitle** | A private encrypted space for letters, prayers, reflections, and notes |
| **Primary color** | **Purple** (resolved) |
| **Status** | Phase 1 foundation |

---

## 1. Visual tone

LTG Vault should feel:

- **Calm** — no urgency, no clutter
- **Private** — trust and discretion over flash
- **Warm** — soft neutrals, human copy
- **Reflective** — space for prayer, letters, journaling
- **Spiritual without being heavy-handed** — gentle, not preachy
- **Mobile-first** — touch targets, readable type, single-column flows

Avoid crypto jargon in user-facing copy. Prefer “vault password,” “recovery phrase,” and “private notes.”

---

## 2. Primary color: purple

**Decision:** LTG Vault primary brand color is **purple**.

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
- Step 2: Vault password + confirmation
- Step 3: Choose 12 or 24 recovery words
- Step 4: Show phrase once (copy affordance)
- Step 5: Confirm phrase
- Privacy notice: secrets never leave the device

### `/vault/unlock`

- Purple primary unlock button
- Tabs or sections: vault password | recovery phrase | legacy device/passkey where applicable
- Calm error messages (“That password didn’t unlock your vault”)
- Legacy `vault-v1` users: existing trusted-device / recovery code paths preserved

### Navigation

- Footer attribution unchanged
- Vault locked/unlocked badge after sign out (existing nav)

---

## 5. Phase scope

**In Phase 1:** tokens, vault setup/unlock, light marketing copy toward “vault” language.

**Later phases:** full LTG rebrand, notes editor, categories/tags UI, passkey vault settings polish.

---

## 6. References

- `docs/TDR_LTG_Vault_MVP.md` §3 Product Identity
- `src/app/globals.css` — design tokens
- `src/components/ui/*` — primitives using CSS variables
