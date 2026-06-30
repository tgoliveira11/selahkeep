# SelahKeep — Design System ("Stillness")

> Source of truth for the SelahKeep visual language. Adopted from the design
> proposal in [`docs/design/`](./design/) (delivered as Claude Design specs).
> Direction: **Stillness** — precise, airy, architectural; calm, private, warm.

| Field | Value |
|-------|-------|
| **Status** | Adopted |
| **Direction** | Stillness (Schibsted Grotesk · tight tracking · hairline borders · soft surfaces) |
| **Source** | [`docs/design/SelahKeep-hero-screens.dc.html`](./design/SelahKeep-hero-screens.dc.html), [`docs/design/SelahKeep-visual-signature.dc.html`](./design/SelahKeep-visual-signature.dc.html) |
| **Implemented in** | `src/app/globals.css` (tokens, dark theme, animations), `src/app/layout.tsx` (font), shared UI primitives & note components |
| **Related** | [`UI_UX_DIRECTION.md`](./UI_UX_DIRECTION.md) |

The visual-signature spec presented two directions on the same purple brand —
**Sanctuary** (soft, filled, rounded; Hanken Grotesk) and **Stillness** (precise,
airy, hairline; Schibsted Grotesk). **Stillness is the adopted direction.** The
hero screens (Notes, Editor + Dictate, Detail + Version history) are built in it.

---

## 1. Foundations

- **Typeface:** **Schibsted Grotesk** (400/500/600/700), loaded via `next/font`
  (self-hosted → no third-party request, CSP-safe), exposed as `--font-sans`.
  Headings use tight tracking (`-0.02em`); countdowns/numbers use `tabular-nums`.
- **Shape:** tighter than before — `--radius: 0.625rem` (10px) for cards/inputs;
  chips/pills ~6px; circular controls for record/avatars.
- **Borders:** hairline. `--border` for default, `--border-2` for emphasis.
- **Shadows:** subtle and lavender-tinted (`--shadow-sm/md/lg`).
- **Chips are OUTLINED, not filled:** category pill = `border --border-2`, text
  `--primary`; tag chip = `border --border`, text `--accent`.
- **Motion:** small, calm, purposeful (see §4). Respect `prefers-reduced-motion`
  for non-essential animation when adding new motion.
- **Accessibility:** WCAG AA contrast; visible focus ring (`--ring`); ≥44px
  touch targets; status text for screen readers.

## 2. Color tokens

All colors are CSS variables in `src/app/globals.css`, with a **light** default
and a **dark** theme via `@media (prefers-color-scheme: dark)`. Never hardcode
hex in components — always use the token. Semantic colors stay semantic (never
purple for success/danger/etc.).

| Token | Role (light) |
|-------|--------------|
| `--background` / `--bg` | Page background `#f7f6fa` |
| `--bg-2` | Recessed fill (live transcript, progress track) `#efedf4` |
| `--foreground` / `--fg` | Primary text `#1a1a1a` |
| `--fg-2` | Secondary text `#54515c` |
| `--muted` | Tertiary text `#6b7280` |
| `--card` | Surface `#ffffff` |
| `--card-muted` / `--card-2` | Inset surface `#f6f3fa` |
| `--primary` | Links, icons, focus, text-on-surface `#5b3a8c` (lightens in dark for contrast) |
| `--primary-solid` | Solid primary **button background** `#5b3a8c` (stays saturated in dark) |
| `--on-primary` | Text on primary button `#ffffff` |
| `--primary-hover` | Primary hover |
| `--accent` | Muted violet emphasis `#8b6bb8` |
| `--accent-muted` / `--lilac` | Soft lilac fill `#ebe4f4` |
| `--lilac-soft` | Softest lilac `#f6f3fa` |
| `--border` / `--border-2` | Hairline / emphasized border |
| `--success`/`--danger`/`--warning`/`--info` | Semantic text/icon |
| `--{semantic}-bg` / `--{semantic}-bd` | Semantic tint fill / outline border (badges, alerts, outlined chips) |
| `--danger-solid` | Solid destructive button background (stays red in both themes) |
| `--add-bg/-fg/-bd`, `--del-bg/-fg/-bd` | Version-diff additions / removals |
| `--skel` | Skeleton base |
| `--ring` | Focus ring |

Use `--primary-solid` + `--on-primary` for primary button backgrounds, and
`--primary` for links/icons/text — this keeps buttons saturated while links stay
legible in dark mode.

## 3. Components (canonical patterns)

- **Buttons** (`src/modules/ui/primitives/button.tsx`): `font-semibold`,
  `--radius`. Primary = `--primary-solid` on `--on-primary`; secondary = card +
  `--border`; danger = `--danger-solid` on white.
- **Category pill / tag chip** (`src/components/notes/note-labels.tsx`): outlined
  (see §1). Category has 📁; tags shown with `#` (stored without).
- **Note card:** card surface, hairline border, outlined chips, resolved badge
  (`--success` outline + tint), pinned marker, `Updated …` footer.
- **Vault Status Dock:** collapsed handle = lock icon + `mm:ss` (`tabular-nums`);
  expanded = circular progress ring, "Vault is open / Auto-locks in mm:ss",
  "Stay unlocked", "Lock now".
- **Locked state:** centered lock medallion, "Your vault is locked", primary
  unlock (passkey/Face ID when available) + secondary "Use vault password".
- **Version history & diff** (`note-version-diff.tsx`, `note-version-history.tsx`):
  From/To compare selectors; diff rows use `--add-*`/`--del-*` with a 3px left
  border and `+`/`−` markers; version list with numbered chips + Restore.
- **Kanban boards** (`src/features/kanban/`): columns are Stillness cards with
  hairline borders, `--card-2` inset surfaces, outlined done/progress chips, and
  token-only priority/label chips. Desktop supports drag/drop; mobile always has
  a visible Move menu plus simple column-forward/back controls so touch users do
  not depend on drag gestures. Board history uses a semantic diff and Restore,
  matching note version-history behavior without raw JSON-first UI.
- **Dictate / voice** (`dictate-button.tsx`, `voice-capture-panel.tsx`): button
  status dot (green `--success` when ready, amber `--warning` pulsing while
  loading) + `%` tooltip; panel states ready → loading (progress) → recording
  (waveform + live transcript) → transcribing → review.
- **Empty / loading / error states:** every list/content surface defines all
  three. Loading uses the shimmer; errors stay reassuring ("your notes are safe").

## 4. Animations (`globals.css`)

`selahReady` (ready-dot breathe), `selahSpin` (transcribing spinner),
`selahPulse` (recording dot), `selahShimmer` (skeleton), `selahWave` (voice
bars), `selahRise` (panel/overlay entrance). Existing `pulse-soft` retained.

## 5. Navigation & layout

- **Mobile:** bottom tab bar — **Notes · Boards · Vault · Account**; the Vault Dock lives
  in the page header.
- **Desktop:** left sidebar with Notes, Boards, Vault, Account + the Vault Dock
  in the top chrome.
- Single-column, mobile-first; reading/editor widths stay comfortable for prose.

## 6. Rules for contributors

- Style with **tokens only**; do not hardcode colors. New surfaces must work in
  **light and dark**.
- Keep account sign-in and vault unlock visually/conceptually separate.
- No crypto jargon in UI copy ("vault password", "recovery phrase", "private
  notes"). Keep the privacy reassurance present where content is created.
- When designing a screen not covered by the hero specs, **infer from these
  tokens, components, and patterns** rather than inventing a new language.
