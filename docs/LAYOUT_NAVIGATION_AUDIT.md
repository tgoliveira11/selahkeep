# Layout and Navigation Audit

Last updated: 2026-06-16

This document classifies app routes after the shared site shell (`SiteShell`: `Nav` + `SiteFooter`) rollout and the `@tgoliveira/secure-auth` migration.

## Shared layout components

| Component | Path | Role |
|-----------|------|------|
| `SiteShell` | `src/components/layout/site-shell.tsx` | Sticky header (`Nav`) + page content + footer |
| `SiteFooter` | `src/components/layout/site-footer.tsx` | Copyright + “Powered by @tgoliveira/secure-auth” attribution |
| `PageLayout` | `src/components/layout/page-layout.tsx` | Content width / spacing wrapper (`<main id="main-content">`) |
| `Nav` | `src/components/layout/nav.tsx` | Product branding, session-aware links, mobile menu |

Route-group layouts apply `SiteShell`:

- `src/app/(public)/layout.tsx` — public/marketing pages
- `src/app/(auth)/layout.tsx` — auth flows (package UI inside `<main>`)
- `src/app/(vault)/layout.tsx` — authenticated product (letters, vault, settings)

Root layout (`src/app/layout.tsx`) provides global providers, fonts, skip link, and styles only.

## Route classification

### Public / product pages (shared `SiteShell`)

| Route | File | Layout | Notes |
|-------|------|--------|-------|
| `/` | `(public)/page.tsx` | `(public)` → `SiteShell` + `PageLayout` | Landing / marketing |
| `/account-deleted` | `(public)/account-deleted/page.tsx` | `(public)` → `SiteShell` + `PageLayout` | Post-deletion confirmation |

### Auth / package pages (shared chrome, package inner UI)

All routes under `(auth)/` use `SiteShell` and wrap children in `<main id="main-content">`. Inner screens are `@tgoliveira/secure-auth/react` pages. Product-specific headings and descriptions are configured in `src/lib/auth/auth-page-messages.ts` and passed through `SecureAuthUIProvider` (`buildSecureAuthConfigFromEnv` → `ui.messages`). The app does **not** modify package internals.

| Route | File | Package component | Copy source |
|-------|------|-------------------|-------------|
| `/login` | `(auth)/login/page.tsx` | `LoginPage` | `authPageMessages.loginTitle` / `loginDescription` |
| `/login/2fa` | `(auth)/login/2fa/page.tsx` | `LoginTwoFactorPage` | `authPageMessages.loginTwoFactorTitle` / `loginTwoFactorDescription` |
| `/login/complete` | `(auth)/login/complete/page.tsx` | `LoginCompletePage` | `authPageMessages.loginCompleteTitle` / `loginCompleteDescription` |
| `/register` | `(auth)/register/page.tsx` | `RegisterPage` | `authPageMessages.registerTitle` / `registerDescription` |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | `ForgotPasswordPage` | `authPageMessages.forgotPasswordTitle` / `forgotPasswordDescription` |
| `/reset-password` | `(auth)/reset-password/page.tsx` | `ResetPasswordPage` | `authPageMessages.resetPasswordTitle`; description uses package `ACCOUNT_PASSWORD_RESET_NOTE` |
| `/verify-email` | `(auth)/verify-email/page.tsx` | `VerifyEmailPage` | Package success/invalid titles via `verifyEmailTitleSuccess` / `verifyEmailTitleInvalid` |
| `/check-email` | `(auth)/check-email/page.tsx` | `CheckEmailPage` | `authPageMessages.checkEmailTitle`; body copy from package constants |

**Package limitation:** Auth form layout and OAuth/passkey UI remain owned by `@tgoliveira/secure-auth`. Copy is customized only via supported `ui.messages` keys and optional page props (`title`, `description`, `afterLoginPath`). Letter-editor privacy copy (`PrivacyNotice`) is reserved for the home page and letter flows, not auth headers.

### Authenticated product pages (shared `SiteShell`)

| Route | File | Layout | Notes |
|-------|------|--------|-------|
| `/letters` | `(vault)/letters/page.tsx` | `(vault)` → `SiteShell` + `PageLayout` | Letter list |
| `/letters/new` | `(vault)/letters/new/page.tsx` | same | Create letter |
| `/letters/[id]` | `(vault)/letters/[id]/page.tsx` | same | View / edit letter |
| `/vault/unlock` | `(vault)/vault/unlock/page.tsx` | same | Vault unlock |
| `/vault/devices` | `(vault)/vault/devices/page.tsx` | same | Trusted devices |
| `/vault/recovery` | `(vault)/vault/recovery/page.tsx` | same | Recovery code |
| `/settings/account` | `(vault)/settings/account/page.tsx` | same | Account, 2FA, password, **active sessions** (no separate `/settings/sessions` route) |

### Standalone / internal pages (no `SiteShell`)

| Route | File | Layout | Notes |
|-------|------|--------|-------|
| `/api-docs` | `api-docs/page.tsx` | Root only | Swagger UI; intentionally **no** nav/footer for full viewport |

### API routes

All handlers under `src/app/api/**/route.ts` — no HTML layout. Auth APIs delegate to `@tgoliveira/secure-auth` via `src/lib/secure-auth.ts` wrappers where applicable.

## Footer attribution

Implemented in `src/components/layout/site-footer.tsx`:

- **Text:** `Powered by @tgoliveira/secure-auth`
- **URL:** https://github.com/tgoliveira11/next-secure-auth-starter
- **Attributes:** `target="_blank"`, `rel="noopener noreferrer"`

Present on every page wrapped by `SiteShell` (public, auth, vault). Omitted on `/api-docs`.

## Accessibility notes

- `Nav` renders semantic `<header>`; mobile drawer uses `<nav aria-label="Main navigation">`.
- Mobile menu toggle exposes `aria-expanded`, `aria-controls`, and `aria-label` (“Open menu” / “Close menu”).
- `SiteFooter` renders semantic `<footer>`.
- Skip link in root layout targets `#main-content` on `PageLayout` and auth layout `<main>`.

## E2E tests

Playwright E2E tests were **removed intentionally**. See `docs/TESTING_STRATEGY.md` for remaining test layers (Vitest unit, security, services, API, features).
