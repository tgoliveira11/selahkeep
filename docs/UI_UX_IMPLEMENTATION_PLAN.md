# UI/UX Implementation Plan — Private Letters Vault MVP

Companion to [`UI_UX_AUDIT.md`](./UI_UX_AUDIT.md). This document records design decisions and the implementation checklist for the UI/UX improvement pass.

---

## 1. Design principles

1. **Calm first** — generous whitespace, soft neutrals, no alarm unless truly destructive.
2. **Privacy honest** — say what we protect and what we cannot recover; no crypto jargon in UI.
3. **Mobile first** — layout, nav, and primary actions work on 320px width before desktop enhancement.
4. **One vault story** — shared unlock panel for gate and unlock page; consistent offline/recovery messaging.
5. **Accessible by default** — labels, focus rings, semantic HTML, dialog patterns for destructive actions.
6. **Security unchanged** — UI never stores or transmits plaintext letters outside the crypto client layer.

---

## 2. Visual direction

Private journal + prayer space + secure vault:

- Warm off-white background (`#faf8f5`)
- Sage green primary (`#4a6741`)
- Warm accent for subtle highlights (`#c4a574`)
- Soft card surfaces, 12px radius, light border, minimal shadow
- No religious clipart, gamification, or crypto-wallet aesthetics

---

## 3. Layout system

| Token | Value | Use |
|-------|-------|-----|
| `--radius` | `0.75rem` | Cards, inputs, buttons |
| `--shadow-sm` | subtle | Cards, nav |
| Page narrow | `max-w-md` (28rem) | Auth, unlock |
| Page medium | `max-w-xl` (36rem) | Account, recovery |
| Page wide | `max-w-2xl` (42rem) | Letters, editor |
| Page padding | `px-4 py-8` mobile; `py-10` desktop | All mains |

`PageLayout` wraps `Nav` + `<main>` with consistent width and vertical rhythm.

---

## 4. Typography direction

- System UI stack (existing)
- Page title: `text-2xl font-semibold tracking-tight`
- Section title: `text-lg font-medium`
- Body: `text-base`; helper: `text-sm text-[var(--muted)]`
- Letter body: `text-base leading-relaxed whitespace-pre-wrap` (no broken `prose` class)

---

## 5. Color / token direction

Extended in `globals.css`:

- Semantic: `--success`, `--warning`, `--info`
- Surface: `--card`, `--card-muted`
- Focus: `--ring` (primary at 40% opacity)

Badges map to tokens, not hardcoded Tailwind palette classes.

---

## 6. Mobile-first navigation model

- Top bar: brand + menu button (authenticated)
- Collapsible panel below header with nav links, lock, sign out
- `aria-expanded`, `aria-controls`, keyboard Escape to close
- Desktop (`md+`): inline links, no hamburger

---

## 7. Desktop layout behavior

- Same max-width columns; optional `md:py-12` on landing
- Letter editor actions: row on `sm+`, stack on mobile
- Device cards: actions row on `sm+`

---

## 8. Component inventory

| Component | Path | Status |
|-----------|------|--------|
| Button | `components/ui/button.tsx` | Updated focus/size |
| Input / Textarea | `components/ui/input.tsx` | Updated |
| Card | `components/ui/card.tsx` | New |
| Alert | `components/ui/alert.tsx` | New |
| Badge | `components/ui/badge.tsx` | New |
| FormField | `components/ui/form-field.tsx` | New |
| PageHeader | `components/ui/page-header.tsx` | New |
| EmptyState | `components/ui/empty-state.tsx` | New |
| LoadingState | `components/ui/loading-state.tsx` | New |
| ErrorState | `components/ui/error-state.tsx` | New |
| SuccessState | `components/ui/success-state.tsx` | New |
| PrivacyNotice | `components/ui/privacy-notice.tsx` | New |
| RecoveryNotice | `components/ui/recovery-notice.tsx` | New |
| ConfirmDialog | `components/ui/confirm-dialog.tsx` | New |
| PageLayout | `components/layout/page-layout.tsx` | New |
| LetterCard | `components/letters/letter-card.tsx` | New |
| DeviceCard | `components/trusted-devices/device-card.tsx` | New |
| VaultUnlockPanel | `features/vault/vault-unlock-panel.tsx` | New |
| Nav | `components/layout/nav.tsx` | Mobile menu |

---

## 9. Prioritized implementation checklist

### P0
- [x] Mobile nav
- [x] Shared `VaultUnlockPanel` + offline notice on unlock page
- [x] Recovery status user labels

### P1
- [x] Design tokens + components
- [x] Landing, auth, letters, editor, detail
- [x] Recovery + passkey framing
- [x] Trusted devices + confirm dialog
- [x] Account settings hierarchy
- [x] Form labels accessibility

### P2
- [x] Account deleted polish
- [ ] Route-level loading/error boundaries (deferred)

---

## 10. Testing checklist

- [x] Main routes render (smoke tests)
- [x] Letter list empty state
- [x] Offline notice only for allowed-offline (existing security tests)
- [x] Passkey PRF-unavailable message (existing + setup tests)
- [x] Account deletion phrase gating (existing)
- [x] ConfirmDialog accessible pattern
- [x] No DB access from UI tests
- [x] No plaintext letter content stored in test fixtures outside crypto layer

---

## 11. Accessibility checklist

- [x] Visible labels on auth/recovery/unlock forms
- [x] `role="status"` / `aria-live` on loading and alerts
- [x] Focus rings on interactive elements
- [x] Confirm dialog: `role="alertdialog"`, focus trap basics, Escape
- [x] Nav `aria-label`, menu button `aria-expanded`
- [x] Skip link (root layout + `#main-content` on `PageLayout` / api-docs)
- [x] jest-axe smoke tests for landing, auth, account-deleted pages

---

## 12. Security-sensitive UI rules

UI must **not**:

- Display letter plaintext in document title or URL
- Persist drafts in localStorage/sessionStorage
- Send letter content to analytics
- Show recovery code after user confirms saved (clear from state)
- Present passkey as vault recovery when PRF path failed
- Hide permanent data loss when recovery methods missing

When uncertain → `TODO_SECURITY_REVIEW_REQUIRED` in code/docs.

---

## UX / security trade-offs documented

| Trade-off | Decision |
|-----------|----------|
| Locked list shows “Private letter” entries | Keep — metadata minimization; explain in banner |
| Offline unlock allowed | Show discreet notice; fail-closed on auth errors |
| Recovery postpone | Allowed with calm warning, not fear-based |
| Native confirm replaced | Styled ConfirmDialog for delete/revoke only |

---

## Remaining design debt

- `@tailwindcss/typography` for long-form reading (optional)
- Automated axe/lighthouse CI in GitHub Actions
- Route-level suspense boundaries (partial — `loading.tsx` / `error.tsx` added for vault/letters/settings)

## Beta readiness blockers (unchanged)

- **Branch coverage ~82%** vs 90% target in `vitest.config.ts` enforced scope — threshold remains at 82% for CI, but **90% branches is still a beta-readiness blocker** until addressed.
- LGPD / legal gates and OAuth-only account deletion re-auth (`TODO_SECURITY_REVIEW_REQUIRED`)
