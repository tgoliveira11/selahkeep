# Secure-Auth Migration Inventory (Phase 0)

Package: `@tgoliveira/secure-auth@0.1.15-internal` (experimental; security review required before production).

## API routes

### Delegated to package (`secureAuth.routes.*` thin wrappers)

| Path | Route key |
|------|-----------|
| `src/app/api/auth/package-health/route.ts` | `health` |
| `src/app/api/auth/password-policy/route.ts` | `passwordPolicy` |
| `src/app/api/auth/register/route.ts` | `register` |
| `src/app/api/auth/forgot-password/route.ts` | `forgotPassword` |
| `src/app/api/auth/reset-password/route.ts` | `resetPassword` |
| `src/app/api/auth/verify-email/confirm/route.ts` | `verifyEmailConfirm` |
| `src/app/api/auth/verify-email/resend/route.ts` | `verifyEmailResend` |
| `src/app/api/auth/login/start/route.ts` | `loginStart` |
| `src/app/api/auth/login/start-form/route.ts` | `loginStartForm` |
| `src/app/api/auth/login/complete/route.ts` | `loginComplete` |
| `src/app/api/auth/login/verify-2fa/route.ts` | `loginVerify2fa` |
| `src/app/api/auth/login/verify-2fa-form/route.ts` | `loginVerify2faForm` |
| `src/app/api/auth/login/verify-2fa-oauth/route.ts` | `loginVerify2faOauth` |
| `src/app/api/auth/passkey/login/options/route.ts` | `passkeyLoginOptions` |
| `src/app/api/auth/passkey/login/verify/route.ts` | `passkeyLoginVerify` |
| `src/app/api/auth/[...nextauth]/route.ts` | `nextAuth` |
| `src/app/api/account/route.ts` | `account` |
| `src/app/api/account/auth-status/route.ts` | `accountAuthStatus` |
| `src/app/api/account/change-password/route.ts` | `changePassword` |
| `src/app/api/account/passkeys/route.ts` | `passkeysList` |
| `src/app/api/account/passkeys/register/route.ts` | `passkeyRegister` |
| `src/app/api/account/passkeys/[id]/route.ts` | `passkeyById` |
| `src/app/api/account/2fa/*` | `twoFactor*` |
| `src/app/api/account/sessions/*` | `sessions*` |

### App-specific (keep)

| Path | Purpose |
|------|---------|
| `src/app/api/auth/passkey/login/vault-unlock/options/route.ts` | Vault unlock passkey |
| `src/app/api/account/passkeys/[id]/enable-vault-unlock/route.ts` | Vault PRF upgrade |
| `src/app/api/passkeys/*` | Recovery passkey flows |
| `src/app/api/vault/*`, `src/app/api/letters/*` | Private letters domain |

## Pages

| Path | Replacement |
|------|-------------|
| Login / 2FA | Package `LoginPage` / `LoginTwoFactorPage` + proxy POST rewrites |
| Register, forgot, reset, verify, check-email, login/complete | Package pages |
| `settings/account` | App vault shell + package security UI |
| Vault / letters routes | App-owned |

## Local modules (removed in Phase 10)

- ~~`src/server/services/auth-service.ts`~~, ~~`auth-login-service.ts`~~, ~~`two-factor-service.ts`~~, ~~`account-session-service.ts`~~, ~~`account-auth-service.ts`~~
- ~~`src/modules/auth/lib/auth-options.ts`~~
- Kept: OAuth UI helpers (`oauth-sign-in-policy`, Microsoft provider config), `session.ts`, `sign-out-client.ts`, `login-token-repository` (vault flow)

## Composition root

`src/lib/secure-auth.ts` — only `createSecureAuth` call.

## Env

`src/lib/env/secure-auth-from-env.ts` maps `AUTH_*` and legacy names (see `.env.example`).

## Email

`src/lib/email-provider.ts` — app transport; package owns templates/orchestration.
