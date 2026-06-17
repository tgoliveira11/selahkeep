> **Archived historical document.** Not an active architecture or source-of-truth document.
> Current source of truth: `docs/TDR_LTG_Vault_MVP.md`, `docs/ADR-005_*`, `docs/ADR-006_*`.


# Secure-Auth Middleware Boundaries

## Package-owned (do not duplicate in app middleware)

- Login rate limits (per-route in package handlers)
- Password reset / register token validation
- Account session revocation enforcement on auth API routes
- 2FA verification during login (challenge cookies, form/JSON login routes)
- NextAuth OAuth and `login-token` credential exchange

## App-owned (`src/proxy.ts`)

| Rule | Purpose |
|------|---------|
| `POST /login` rewrite | Package `LoginPage` form action → `/api/auth/login/start-form` |
| `POST /login/2fa` rewrite | Package `LoginTwoFactorPage` form action → `/api/auth/login/verify-2fa-form` |
| `twoFactorPending` JWT redirect | If NextAuth JWT has `twoFactorPending` and user navigates outside auth paths, redirect to `/login/2fa` |

Allowed paths while 2FA is pending: `/login`, `/api/auth`, static assets, `/account-deleted`.

Uses `getToken({ secret: process.env.NEXTAUTH_SECRET })` — must match package `NEXTAUTH_SECRET`.

## App-owned (route-level, not middleware)

- Vault unlock requirements (`requireFullyAuthenticatedUser` + vault session)
- Letter CRUD authorization
- Trusted device / recovery code flows
- Admin/feature flags (if added)

## Session reads for product APIs

`src/modules/auth/lib/session.ts` calls:

```typescript
const services = await secureAuth.getServices();
const session = await getServerSession(services.getAuthOptions());
```

This aligns product route authorization with package-issued NextAuth sessions (fixes prior split-brain with local `auth-options.ts`).

## Not in proxy

- Email verification gates (configurable; currently `requireEmailVerificationBeforeSignIn: false`)
- Single active session polling (client: `SessionProvider refetchInterval` from `secureAuth.uiConfig.sessionPolicy`)
