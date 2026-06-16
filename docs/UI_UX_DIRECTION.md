# UI / UX Direction — Letters to God

Last updated: 2026-06-16

This document defines the visual and content direction for public and product-facing pages. Implementation lives in `src/app/globals.css`, `src/components/layout/`, `src/components/marketing/`, and route-group layouts.

## Product tone

Calm, private, hopeful, spiritual but not heavy-handed, simple, trustworthy, mobile-first, warm — not corporate, not overly technical.

**Positioning:** Letters to God is a quiet private space where people can write personal letters, keep them safely, revisit them over time, and mark when they feel a prayer or letter has been answered.

## Visual language

| Element | Direction |
|---------|-----------|
| Background | Warm neutral (`--background: #faf8f5`) |
| Primary | Soft green (`--primary: #4a6741`) for links, buttons, brand |
| Accent | Warm gold (`--accent: #c4a574`) for subtle emphasis |
| Cards | White or muted (`--card`, `--card-muted`), soft border, light shadow |
| Spacing | Generous vertical rhythm between sections; comfortable padding on mobile |
| Typography | System UI stack; clear heading hierarchy (h1 → h2); relaxed line height |
| Noise | Minimal decoration; no busy gradients or dense dashboards on public pages |
| CTAs | Clear primary (“Create account”) + secondary (“Sign in”) pairs |

## Layout shell

All public, auth, and vault routes use `SiteShell`:

```text
Header (Nav) → Main (PageLayout or auth `<main>`) → Footer (SiteFooter)
```

- **Max width:** Marketing content uses `PageLayout` `marketing` width (`max-w-4xl`); auth forms use `narrow` (`max-w-md`).
- **Footer:** Must retain “Powered by @tgoliveira/secure-auth” linking to the [next-secure-auth-starter](https://github.com/tgoliveira11/next-secure-auth-starter) repo with `target="_blank"` and `rel="noopener noreferrer"`.

## Public home page (`/`)

Required sections (see `src/lib/marketing/home-copy.ts`):

1. **Hero** — product title, subtitle, reassurance, CTAs
2. **What you can do** — four feature cards (write, keep, mark answered, recover)
3. **Privacy** — plain language; no crypto jargon (no PRF, envelope encryption, vault key, IndexedDB)
4. **Community** — clearly marked as future / not live
5. **Account** — why sign-up matters (sessions, recovery; password ≠ letter recovery)
6. **Final CTA** — “Start your private letter” with account CTAs

## Auth pages

Inner UI is owned by `@tgoliveira/secure-auth`. Product copy is customized via:

- `src/lib/auth/auth-page-messages.ts` → `SecureAuthUIProvider` `messages`
- Optional page props (`title`, `description`, `afterLoginPath`) on thin wrappers in `src/app/(auth)/`

**Do not** show letter-editor privacy copy (`PrivacyNotice`) on auth pages.

## Accessibility

- Semantic landmarks: `<header>`, `<main id="main-content">`, `<footer>`
- Skip link in root layout targets `#main-content`
- Focus-visible outlines use `--ring` / `--primary`
- Sufficient contrast on body text (`--foreground` on `--background`) and muted secondary text

## Related docs

- [`LAYOUT_NAVIGATION_AUDIT.md`](./LAYOUT_NAVIGATION_AUDIT.md) — route classification and shell coverage
- [`UI_UX_AUDIT.md`](./UI_UX_AUDIT.md) — screen inventory and historical issues
- [`UI_UX_IMPLEMENTATION_PLAN.md`](./UI_UX_IMPLEMENTATION_PLAN.md) — component checklists
