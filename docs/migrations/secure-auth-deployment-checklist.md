# Secure-Auth Deployment Checklist

## Required production environment

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Long random secret (`openssl rand -base64 32`) |
| `TWO_FACTOR_SECRET_ENCRYPTION_KEY` | 32-byte base64 (`openssl rand -base64 32`) |
| `APP_BASE_URL` / `NEXTAUTH_URL` | Must match deployed origin (including port if non-443) |
| `EMAIL_FROM` | Valid From header |
| `EMAIL_PROVIDER` | **Not** `console` in production |
| `AUTH_COOKIE_SECURE` | `true` in production (or rely on `NODE_ENV=production` default) |
| `AUTH_RATE_LIMIT_STORE` | `postgres` when running multiple instances |

## OAuth

Redirect URIs in provider consoles:

- `{APP_BASE_URL}/api/auth/callback/google`
- `{APP_BASE_URL}/api/auth/callback/apple`
- `{APP_BASE_URL}/api/auth/callback/azure-ad`

Microsoft: register **Web** platform redirect URI; set `AUTH_MICROSOFT_TENANT_ID` appropriately.

## WebAuthn

| Variable | Notes |
|----------|-------|
| `WEBAUTHN_ORIGIN` | Must match browser URL exactly (no `127.0.0.1` vs `localhost` mismatch) |
| `WEBAUTHN_RP_ID` | Production registrable domain (e.g. `example.com`) |

## Database

- [ ] Backup before first production cutover from local auth
- [ ] `npm run db:migrate` in CI/CD before deploy
- [ ] `npm run db:check-auth` passes

## Build & runtime

- [ ] `npm ci && npm run build` (build does **not** require `NEXTAUTH_SECRET`; runtime does)
- [ ] Set `NEXTAUTH_SECRET` and `TWO_FACTOR_SECRET_ENCRYPTION_KEY` in the hosting provider before serving traffic
- [ ] `npm run start` serves auth pages
- [ ] `curl {APP_BASE_URL}/api/auth/package-health` → `{ "ok": true, "package": "@tgoliveira/secure-auth", "version": "0.1.17-internal" }`
- [ ] `npm audit --audit-level=high` (recommended)

## Package maturity

`@tgoliveira/secure-auth@0.1.17-internal` is experimental (0.1.x-internal). Schedule security review before production traffic.

## Manual QA (record in migration report)

- [ ] Register
- [ ] Email verification (if enabled)
- [ ] Password login (+ 2FA if enabled)
- [ ] Forgot / reset password (note vault disclaimer in email)
- [ ] OAuth (each configured provider)
- [ ] Passkey register + login
- [ ] 2FA setup + login
- [ ] Sessions list + revoke
- [ ] Change password
- [ ] Account deletion
- [ ] Single active session (if `AUTH_SINGLE_ACTIVE_SESSION=true`)
