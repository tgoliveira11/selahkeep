# UI/UX Audit — Private Letters Vault MVP

Audit date: June 2026  
Scope: All user-facing routes, shared components, vault/security flows, mobile/desktop behavior, accessibility, and copy.

---

## Screen inventory

| Route | Screen name | Purpose | Current state | Main problems | Priority |
|-------|-------------|---------|---------------|---------------|----------|
| `/` | Landing | Privacy promise + sign up/in | Minimal centered copy | Both CTAs go to `/login`; no register path; no feature explanation | P1 |
| `/login` | Sign in | Email/password + OAuth | Functional form | Placeholder-only fields; no privacy reassurance block | P1 |
| `/register` | Create account | Email/password signup | Functional | No OAuth; placeholder-only labels; no privacy copy | P1 |
| `/letters` | Letter list | Browse private letters | List + locked titles | Plain empty state; no card system; weak locked-state guidance | P1 |
| `/letters/new` | Write letter | Compose encrypted letter | Form + inline vault gate | No privacy reassurance in editor; cancel only via back | P1 |
| `/letters/[id]` | Letter detail | Read/edit/delete/mark answered | Basic read/edit | No back nav; edit mode loses labels; native confirm for delete | P1 |
| `/vault/unlock` | Vault unlock | Dedicated unlock/setup | Multi-mode page | Raw recovery enum; no offline notice; duplicates gate UI | P0 |
| `/vault/recovery` | Recovery methods | Recovery code + passkey | Two sections | Recovery code in gray box only; PRF jargon; weak postpone UX | P1 |
| `/vault/devices` | Trusted devices | Register/rename/revoke | List cards | No empty state; native confirm; crowded on mobile | P1 |
| `/settings/account` | Account settings | Account deletion | Delete-only section | No settings summary; dense legal copy | P1 |
| `/account-deleted` | Post-deletion | Confirm deletion complete | Short message | Minimal styling | P2 |
| `/api-docs` | API docs | Swagger UI (dev) | Vendor embed | No app shell | P2 |

---

## 1. Complete list of screens/routes

See table above. Route groups `(auth)`, `(vault)`, `(public)` do not appear in URLs. Single root layout; no route-level `loading.tsx` / `error.tsx`.

---

## 2–3. Purpose and user flow (by area)

### Public

- **Landing:** User learns product name and privacy promise → chooses sign in or get started (both currently → login).
- **Login / Register:** Authenticate → redirect to `/letters`. Vault setup deferred until first write.

### Letters (core)

- **List:** Authenticated user sees letters; if vault locked, titles hidden as “Private letter”.
- **New letter:** If vault locked, inline `VaultAccessGate` for setup/unlock → compose → encrypt client-side → save via API.
- **Detail:** If locked, gate for read unlock → decrypt → read/edit/answer/delete.

### Vault & recovery

- **Unlock page:** Init vault OR unlock via device/passkey/recovery OR redirect if already unlocked.
- **Recovery:** Generate one-time recovery code; optional passkey; postpone allowed with warning.
- **Devices:** List trusted devices; register current browser; rename/revoke.

### Account

- **Settings:** Load deletion requirements → password (credentials) + phrase → delete → sign out → deleted page.

---

## 4. Main UX problems

| # | Problem | Priority |
|---|---------|----------|
| 1 | Two parallel unlock UIs (`/vault/unlock` vs `VaultAccessGate`) with inconsistent offline notice and recovery status | P0 |
| 2 | Mobile nav overflows (6+ links + buttons, no menu) | P0 |
| 3 | Landing “Get started” does not route to register | P1 |
| 4 | Recovery status shown as raw enum (`Protected` / `Basic` / `At Risk`) | P1 |
| 5 | Placeholder-as-label on auth, recovery, edit forms | P1 |
| 6 | Uniform “Loading...” with no accessible busy state | P1 |
| 7 | Native `confirm()` for destructive actions | P1 |
| 8 | Empty states missing (devices list) or too minimal (letters) | P1 |
| 9 | Passkey PRF failure copy is long and technical | P1 |
| 10 | No visual design system — ad-hoc cards and badge colors | P2 |
| 11 | Lock vault vs sign out not explained | P2 |
| 12 | Letter detail lacks back navigation and date display | P2 |

---

## 5. Visual design problems

- Single font stack, no typographic scale tokens.
- Hardcoded Tailwind greens/blues/reds outside CSS variables.
- Inconsistent max-widths (`md`, `xl`, `2xl`) without page-type rules.
- `--card` token defined but unused.
- `prose` class used without typography plugin.
- No elevation/shadow/radius tokens — mixed `rounded-lg` only.

**Priority:** P2 (polish), but blocks cohesive beta feel.

---

## 6. Mobile usability problems

- Nav bar not responsive — links wrap or overflow on narrow viewports.
- No thumb-zone primary actions on long forms (editor actions mid-page only).
- Trusted device actions stack only at `sm:` — acceptable but inconsistent.
- Recovery code monospace block readable but no copy button on mobile.
- No bottom action bar for letter save on small screens.

**Priority:** P0 for nav; P1 for editor/recovery actions.

---

## 7. Desktop usability problems

- Content correctly centered but sparse — large empty margins without intentional whitespace rhythm.
- No side navigation; all nav in top bar (fine for MVP if mobile works).
- Letter list could use wider reading column on large screens (optional).

**Priority:** P2.

---

## 8. Accessibility issues

| Issue | Priority |
|-------|----------|
| Auth/recovery inputs lack visible `<label>` | P1 |
| No `aria-live` for loading/errors | P1 |
| Button inside `<Link>` on landing and list CTA | P1 |
| Nav lacks `aria-label` | P2 |
| No skip link | P2 |
| Native confirm dialogs poor SR support | P1 |
| Focus management after dialog close | P1 |

---

## 9. Copywriting issues

- Technical terms leak: PRF, recovery enum values, “vault envelopes”.
- Spiritual tone underused outside placeholders (“Dear God…”).
- Privacy promise strong but repeated verbatim — could vary by context.
- “Encrypting & saving” is accurate but slightly technical for some users → prefer “Saving securely…”.

**Priority:** P1.

---

## 10. Security/UX clarity issues

| Issue | Priority |
|-------|----------|
| Offline unlock notice only in gate, not unlock page | P0 |
| Revoked device errors must not show offline success (implemented server-side; UI must stay consistent) | P0 |
| Unsupported passkey must not appear as recovery-ready (partially addressed) | P0 |
| Locked list reveals letter existence (intentional trade-off — needs gentle explanation) | P1 |
| Recovery postpone without strong but calm warning | P1 |
| Account deletion copy accurate but dense | P1 |

---

## 11–14. Missing states

| State | Where missing | Priority |
|-------|---------------|----------|
| Loading | Spinner/skeleton; `aria-busy` | P1 |
| Error | Retry actions; `ErrorState` component | P1 |
| Empty | Devices list; letters list minimal | P1 |
| Success | Recovery saved, device revoked — green text only | P2 |

---

## 15. Navigation issues

- No link to `/vault/unlock` when vault locked.
- No register from landing.
- Lock/sign out both visible without explanation.

**Priority:** P1.

---

## 16. Form usability issues

- Placeholder-only labels (auth, recovery unlock, edit mode).
- Recovery code input needs label + helper text.
- Account deletion phrase field good (has label).

**Priority:** P1.

---

## 17. Trust/privacy communication

- Privacy promise present on landing; missing on editor and auth.
- Need reusable `PrivacyNotice` on sensitive flows.

**Priority:** P1.

---

## 18. Recovery / passkey / trusted-device communication

- Recovery code one-time display needs calmer warning + copy action.
- Passkey PRF unavailable needs simplified copy (headline exists; UI framing weak).
- Trusted device revoke needs styled confirm dialog explaining consequence.

**Priority:** P1.

---

## 19. Account deletion UX

- Phrase + password gating is strong (good).
- Needs clearer step hierarchy and destructive styling containment.
- Post-deletion page minimal.

**Priority:** P1.

---

## 20. Prioritized improvements

### P0 — blocks usability or security clarity

1. Mobile-responsive navigation.
2. Unify vault unlock UI; surface offline notice on unlock page.
3. User-friendly recovery status labels (not raw enums).
4. Ensure passkey-unavailable and offline-unlock messaging consistent across unlock surfaces.

### P1 — important before private beta

5. Design system components (Card, Alert, Empty/Loading/Error states, FormField, ConfirmDialog).
6. Landing CTAs fixed; auth labels + privacy notice.
7. Letter list empty state, letter cards, locked-state banner.
8. Letter editor/detail: labels, back nav, privacy notice, styled delete confirm.
9. Recovery flow: copy button, calm warnings, simplified passkey copy wrapper.
10. Trusted devices: empty state, DeviceCard, confirm dialog.
11. Account settings visual hierarchy.

### P2 — polish

12. Typography tokens, subtle shadows, success states.
13. Account-deleted page polish.
14. API docs shell consistency.

---

## Design debt (remaining after implementation pass)

- Route-level Next.js `loading.tsx` / `error.tsx` not added.
- OAuth on register page not in scope (backend parity).
- Rich text / typography plugin deferred.
- Full WCAG audit / axe CI not added.
