# Auth Package Migration — `@tgoliveira/secure-auth`

## Goal

Replace the *local* authentication/account/security implementation in `letters-to-god` with the reusable account/auth system from:

- `@tgoliveira/secure-auth` (Next.js App Router + Drizzle + PostgreSQL)

While preserving `letters-to-god`’s product domain:

- letters, vault/private-letter crypto, letter routes, product UI/copy
- any vault-specific recovery or vault-unlock logic that is not owned by the package

## Package integration pattern (source of truth)

The package is integrated via a single composition root:

```ts
import { createSecureAuth } from "@tgoliveira/secure-auth/next";

export const secureAuth = createSecureAuth(config);
// secureAuth.routes.* are the handlers to wire into app routes
```

Supported public entry points (from package README):

- `@tgoliveira/secure-auth/next`: `createSecureAuth(config)` (+ NextAuth route handler export)
- `@tgoliveira/secure-auth/react`: UI primitives/pages/providers (client-side)
- `@tgoliveira/secure-auth/client`: browser client helpers (passkeys, sign-in helpers)
- `@tgoliveira/secure-auth/drizzle/schema`: auth schema (`authSchema`, `authSchema` table exports)
- `@tgoliveira/secure-auth/email`: `EmailProvider` type
- `@tgoliveira/secure-auth`: `authSchema`, types, `safeLogger`, etc.

### Package configuration shape (key fields we must provide)

`SecureAuthConfig` includes (high level):

- `db`: an app-provided Drizzle DB client
- `app`: `{ name, slug, baseUrl }`
- `auth`: `{ nextAuthSecret, twoFactorEncryptionKey, afterLoginPath, afterLogoutPath, requireEmailVerificationBeforeSignIn }`
- `oauth`: optional OAuth provider credentials:
  - `oauth.google`, `oauth.apple`, `oauth.microsoft`
- `email`: `{ from, provider, templates? }`
- `webauthn`: `{ rpId, rpName, origin }`
- `ui`: optional routes/messages/theme overrides (copy + paths)
- `passwordPolicy`: optional policy overrides
- `sessions`: optional session policy overrides (single active session, polling interval)
- `rateLimit.store`: `"memory" | "postgres"`

## Step 1 audit — classification (what we replace vs keep)

> This note is intentionally scoped to auth/account code paths relevant to the next implementation step (route delegation).
> After this first integration slice is stable, we will do a deeper “remove duplicates” pass.

### UI (package React pages)

Auth/account **pages** now delegate to `@tgoliveira/secure-auth/react` with only small app customizations:

- `SecureAuthUIProvider` in root layout (`secureAuth.uiConfig`)
- `LettersAuthChrome` (`PrivacyNotice`) on login/register/2FA wrappers
- `afterLoginPath="/letters"` on sign-in completion pages

Package-owned credential login flow (form POST, not client JSON):

| App route | Handler |
|-----------|---------|
| `POST /api/auth/login/start-form` | `secureAuth.routes.loginStartForm.POST` |
| `POST /api/auth/login/verify-2fa-form` | `secureAuth.routes.loginVerify2faForm.POST` |
| `GET /login/complete` | package `LoginCompletePage` |
| `POST /api/auth/login/complete` | `secureAuth.routes.loginComplete.POST` |

Account passkey **sign-in** API routes delegate to the package; vault-unlock passkey routes remain product-specific.

### Replace with package (API routes + NextAuth)

We will delegate these local route handlers to the package `secureAuth.routes.*` handlers:

1. NextAuth App Router handler
   - `src/app/api/auth/[...nextauth]/route.ts`
2. Credential/OAuth login + account email/password flows
   - `src/app/api/auth/register/route.ts`
   - `src/app/api/auth/login/start/route.ts`
   - `src/app/api/auth/login/verify-2fa/route.ts` (TOTP verification)
   - `src/app/api/auth/login/verify-2fa-oauth/route.ts` (TOTP verification for OAuth users)
   - `src/app/api/auth/forgot-password/route.ts`
   - `src/app/api/auth/reset-password/route.ts`
   - `src/app/api/auth/verify-email/resend/route.ts`
   - `src/app/api/auth/verify-email/confirm/route.ts`
3. Account deletion, account auth status, and session management
   - `src/app/api/account/route.ts` (GET + DELETE)
   - `src/app/api/account/auth-status/route.ts`
   - `src/app/api/account/change-password/route.ts`
   - `src/app/api/account/sessions/*`
   - `src/app/api/account/2fa/*` (status/setup/verify/disable/backup codes regenerate)

Expected behavior: route payloads/responses must remain compatible with our existing `src/lib/api-client/*` clients and UI pages.

### Keep as app wrapper/config

We will add app-owned composition root + DB integration:

- `src/lib/secure-auth-db.ts` (app-owned Drizzle DB wiring for the package auth schema)
- `src/lib/secure-auth.ts` (app-owned `createSecureAuth(config)` composition root)

We will also keep our existing:

- DB connection (`src/lib/db/index.ts`)
- env var names (`.env.example`) and app-specific env mapping (no package forks)
- our app-owned email delivery transport and custom email templates (where customized)

### Keep as product-specific (vault/private-letter and vault-unlock passkeys)

Parts of our current auth implementation are tightly coupled to our *vault* / product recovery design and are not currently supported by the package contract:

1. Vault passkey unlock (PRF/encrypted vault envelope)
   - `src/app/api/auth/passkey/login/vault-unlock/options/route.ts`
2. Vault recovery passkeys (product-specific flows)
   - `src/app/api/passkeys/**/*`
3. “Enable vault unlock for this passkey” (product-specific PRF vault envelope linking)
   - `src/app/api/account/passkeys/[id]/enable-vault-unlock/route.ts`

These endpoints must not be removed or altered as they implement product-specific vault unlocking cryptography.

### Needs review / likely keep local for now

The package supports passkeys for account sign-in, but our app’s account passkey management UI/API currently includes vault-unlock-specific fields and server responses:

- our UI expects `vaultUnlockEnabled`, `prfSupported`, etc.
- our API endpoints for enabling vault unlock generate/consume product-specific PRF-based envelopes

Because the package passkey schema/handlers appear not to include vault-unlock-specific fields in its public response contract, we will likely keep these local routes for now:

- `src/app/api/account/passkeys/*` (except possibly those that are strictly sign-in-only; we will verify after first slice)

## Gaps / TODOs

- Verify exact response shapes compatibility after route delegation for:
  - two-factor (TOTP) setup/start/verify/disable/backup code regenerate
  - account sessions list + revoke semantics
  - email verification resend/confirm payload shapes
  - account deletion requirements payload shape + confirmation phrase behavior
- After the first stable integration:
  - add “static guards” tests preventing future accidental reintroduction of local duplicate auth logic
  - remove unused local auth modules where the package fully replaces them

> Security note: This migration must never route plaintext vault/private-letter content through auth APIs.
> `@tgoliveira/secure-auth` is only for account authentication; product vault/letters code remains separate.

