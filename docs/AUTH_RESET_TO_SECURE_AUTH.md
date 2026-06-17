# Auth reset to `@tgoliveira/secure-auth@0.1.19-internal`

Branch: `main` (Phase 0 complete)

## Goal

Remove competing local auth/account implementation. Keep thin `@tgoliveira/secure-auth` integration and preserve **notes / vault** product functionality.

## Removed (local competing auth)

| Area | Removed |
|------|---------|
| Modules | `src/modules/auth/**`, `account/**`, `sessions/**`, `two-factor/**`, `passkeys/**` (account paths) |
| Services | `account-service`, `passkey-account-service`, `passkey-login-service` shims |
| Client | `src/features/passkey/sign-in-with-passkey.ts`, `src/lib/secure-auth/react-client.ts` shim |
| UI | `src/components/auth/**`, `src/components/settings/**` (package React components replace these) |
| Policies | local TOTP/backup-code/two-factor-secret-crypto, login-request-context, OAuth provider local impl, **local `password-hashing` (bcrypt)**, **local `password-policy` module** (package owns policy) |
| Tests | local auth route/service/OAuth/TOTP/settings tests; `password-hashing.test.ts` |
| Next config | `@tgoliveira/secure-auth/react/client` webpack/turbopack alias |

## Preserved (product)

| Area | Notes |
|------|-------|
| Notes | pages, API, crypto-client, services, repositories |
| Vault | init/status, recovery phrase, trusted devices, passkey PRF envelopes |
| Vault passkeys | `/api/passkeys/**` recovery registration/authentication |
| Vault login PRF | `/api/auth/passkey/login/options` PRF enrichment via `passkeyLoginVaultService` |
| Vault unlock after login | `/api/auth/passkey/login/vault-unlock/options` (product-only) |
| Enable vault on account passkey | `/api/account/passkeys/[id]/enable-vault-unlock` via `passkeyVaultEnvelopeService` |
| Session guards | `src/lib/auth/session.ts` using `secureAuth.getServices().getAuthOptions()` |
| Crypto | `src/lib/crypto-client/**` |

## Package-provided features (thin integration)

| Concern | App wiring |
|---------|------------|
| Composition root | `src/lib/secure-auth.ts` → `createSecureAuth` |
| DB | `src/lib/secure-auth-db.ts`, `src/lib/secure-auth-schema.ts` |
| Env | `src/lib/env/secure-auth-from-env.ts` |
| Email | `src/lib/email-provider.ts` + templates in `secure-auth.ts` |
| UI provider | `SecureAuthProviders` + `secureAuthUiPublicConfig` in root layout |
| API routes | `export const POST = secureAuth.routes.*.POST` delegates |
| Auth pages | thin wrappers importing `@tgoliveira/secure-auth/react` pages |
| Account settings | `AccountSettingsPage` wrapper with vault recovery footer links |
| NextAuth | `secureAuth.routes.nextAuth` catch-all |

Package owns: login, register, OAuth, account passkey sign-in, 2FA, password flows, sessions, account deletion.

## Vault passkey vs account passkey

| Flow | Owner |
|------|-------|
| Account passkey sign-in | **Package** (`passkeyLoginOptions`, `passkeyLoginVerify`, package `signInWithPasskey`) |
| Account passkey management (list/register/delete) | **Package** (`passkeysList`, `passkeyRegister`, `passkeyById`) |
| Vault PRF envelope on login options | **Product** (`passkeyLoginVaultService.enrichLoginOptionsWithVaultPrf`) |
| Second WebAuthn step for vault unlock token | **Product** (`/api/auth/passkey/login/vault-unlock/options`) |
| Recovery passkey register/authenticate | **Product** (`/api/passkeys/**`, `passkeyService`) |
| Enable vault unlock on existing account passkey | **Product** (`passkeyVaultEnvelopeService`) |

### TODO_SECURITY_REVIEW_REQUIRED

- Post-login automatic vault unlock previously lived in `sign-in-with-passkey.ts`. After reset, users unlock via `/vault/unlock` unless a future package hook restores PRF-at-login without a local account passkey client.
- Package `PasskeySettings` may not surface `vaultUnlockEnabled` / enable-vault-unlock UX; product route remains but settings integration needs UX review.
- Shared `passkey_credentials` table: package writes sign-in credentials; product writes vault flags/envelopes. Coordinate schema migrations with package `authSchema`.

## Database

- Auth tables: owned by `@tgoliveira/secure-auth` `authSchema`, wired through `secure-auth-db.ts` (shared Drizzle client).
- **Do not drop** letter, vault, trusted device, recovery envelope tables or user FKs.
- **Migration decision:** keep existing combined schema; run `npm run db:migrate` for package migrations. No letter/vault table drops in this reset.
- `login-token-repository` remains read-only for product vault unlock against `user_two_factor_login_tokens`.

## Allowed wrappers (kept)

- `src/lib/secure-auth.ts` (minimal bootstrap + email templates)
- `src/lib/secure-auth-db.ts`, `src/lib/secure-auth-schema.ts`
- `src/lib/env/secure-auth-from-env.ts`
- `src/lib/email-provider.ts`
- `src/lib/auth/session.ts`, `src/lib/auth/sign-out-client.ts` (package delegate)
- `src/lib/account-auth-messages.ts` (vault note copy for emails)

## Guard test

`src/test/security/no-local-auth-implementation.test.ts` — forbidden paths absent; auth routes delegate to `secureAuth.routes`.

## Validation

```bash
npm install
npm run lint
npm run test
npm run test:coverage
npm run build
npm run dev   # confirm http://localhost:3001/ loads
```

## Phase 0 status

**Complete on `main`.** Account/auth is owned exclusively by `@tgoliveira/secure-auth@0.1.19-internal`. Guard tests: `no-local-auth-implementation.test.ts`, `secure-auth-delegate-routes.test.ts`, `secure-auth-env-and-imports.test.ts`.
