# Secure-Auth Migration Report

**Package:** `@tgoliveira/secure-auth@0.1.11-internal`  
**Status:** Integration complete; Phase 10 local auth code removal partially deferred.

## What changed

### Composition & config

- Single composition root: `src/lib/secure-auth.ts` (`createSecureAuth`).
- Env mapping: `src/lib/env/secure-auth-from-env.ts`, `src/lib/env/parse.ts`.
- App-owned email transport: `src/lib/email-provider.ts` → existing SMTP/console module.
- Password reset emails include vault disclaimer via `email.templates` in `secure-auth.ts`.

### API routes

- 30+ thin wrappers to `secureAuth.routes.*`.
- Added `GET /api/auth/package-health` and `GET /api/auth/password-policy`.
- Product routes retained: vault passkeys, letters, trusted devices, recovery.

### UI

- `SecureAuthUIProvider` + `SessionProvider` with `refetchInterval` from `uiConfig.sessionPolicy`.
- Package pages for register, forgot/reset, verify/check email, login complete.
- Package pages for login, 2FA, register, forgot/reset, verify/check email, login complete.
- `LettersAuthChrome` on auth pages via package `header` prop.

### Session alignment

- `src/modules/auth/lib/session.ts` now uses `secureAuth.getServices().getAuthOptions()` instead of local `auth-options.ts` — fixes split-brain between package NextAuth and product session reads.

### Styles

- `@import "@tgoliveira/secure-auth/styles.css"` in `globals.css`.

### Tests

- Import boundary + env mapping: `src/test/unit/secure-auth-env-and-imports.test.ts`
- Package health route: `src/test/api/package-health-route.test.ts`

## Removed / replaced

- Inline env parsing in `secure-auth.ts` (moved to env module).
- Local `auth-options` usage in session reads.

## Deferred (Phase 10)

| Item | Status |
|------|--------|
| Delete local auth services/schema | **Done** — see below |
| Thin re-export login pages only | Resolved — package pages + proxy POST rewrites |

## Phase 10 removals (completed)

- Deleted `src/modules/auth/lib/auth-options.ts` and `src/lib/auth/auth-options.ts`
- Deleted local auth services: `auth-service`, `auth-login-service`, `two-factor-service`, `account-session-service`, `account-auth-service` (+ server shims)
- Deleted repositories only used by those services: `two-factor-repository`, `account-session-repository`, `account-token-repository`
- Schema: auth tables re-exported from `@tgoliveira/secure-auth/drizzle/schema`; product tables in `src/lib/db/app-schema.ts` (including vault-extended `passkeyCredentials`)
- `passkey-login-service` trimmed to vault-unlock only; added `login-token-repository` for package-issued login tokens
- Removed service-level tests; added targeted tests to maintain 90% coverage

## Known gaps

- `SingleActiveSessionMonitor` not exported in 0.1.11 — using `SessionProvider refetchInterval` only.
- Optional debug routes (`/api/auth/login/challenge-status`, `/api/auth/login/trace`) not mounted.
- Package is **0.1.x-internal** — not production-stable contract.

## Manual QA

| Flow | Result |
|------|--------|
| Automated tests (`npm run test:coverage`) | **Pass** — 93.73% lines, 753 tests |
| `npm run build` | **Pass** |
| Credentials login + 2FA (browser) | Re-verify after 0.1.11 session alignment fix |
| OAuth / passkey | Previously working |
| Full manual checklist | See `secure-auth-deployment-checklist.md` |

## Validation commands

```bash
npm ci
npm run db:migrate
npm run db:check-auth
npm run lint
npm run test:coverage
npm run build
npm audit --audit-level=high
```

## Related docs

- `docs/migrations/secure-auth-inventory.md`
- `docs/migrations/secure-auth-db-plan.md`
- `docs/migrations/secure-auth-middleware.md`
- `docs/migrations/secure-auth-deployment-checklist.md`
- `docs/AUTH_PACKAGE_MIGRATION.md` (earlier integration notes)
