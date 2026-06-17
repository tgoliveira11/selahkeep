# API Reference (OpenAPI / Swagger)

The Private Letters Vault MVP exposes a REST API under `/api/*`. You can browse it in a **Swagger UI** locally or import the OpenAPI spec into other tools.

## Swagger UI (local)

1. Start the app:

   ```bash
   npm run dev
   ```

2. Open **[http://localhost:3001/api-docs](http://localhost:3001/api-docs)**

   Swagger UI assets are served from `/swagger-ui/*` (copied from `swagger-ui-dist` on `npm install`) so they work with the app's Content-Security-Policy.

3. For authenticated routes, **sign in to the web app first** in the same browser (NextAuth session cookie). Then use **Try it out** in Swagger UI.

Swagger UI is **disabled in production** unless you set:

```bash
ENABLE_API_DOCS=true
```

The `/api-docs` page intentionally **does not use `SiteShell`** (`Nav` / `SiteFooter`) so Swagger UI can use the full viewport. It still inherits the root skip link and sets `id="main-content"` on its `<main>`. See `ARCHITECTURE.md` for rationale.

## OpenAPI spec file

| Resource | URL / path |
|----------|------------|
| YAML source (repo) | `docs/openapi.yaml` |
| JSON at runtime | `GET http://localhost:3001/api/openapi` |

Import `docs/openapi.yaml` or the JSON URL into:

- [Postman](https://www.postman.com/) (Import → OpenAPI)
- [Insomnia](https://insomnia.rest/)
- [Swagger Editor](https://editor.swagger.io/) (paste YAML or import file)

## Authentication in Swagger / Postman

Most routes require a **NextAuth session cookie**:

- Local dev cookie name: `next-auth.session-token`
- Production (HTTPS): often `__Secure-next-auth.session-token`

After logging in via the browser, copy the cookie from DevTools → Application → Cookies, or use Swagger UI in the same browser session so cookies are sent automatically.

Registration (`POST /api/auth/register`) and NextAuth OAuth/credentials flows are documented in ADR-005 and `docs/API_REFERENCE.md`. Interactive OAuth is easiest through the web login page. Microsoft/GitHub sign-in is account authentication only and does not unlock the vault.

### Account two-factor authentication (TOTP)

Optional account-level 2FA protects **sign-in only** — it does not decrypt private letters or replace the vault recovery code.

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/account/2fa/status` | Session |
| `POST` | `/api/account/2fa/setup/start` | Session |
| `POST` | `/api/account/2fa/setup/verify` | Session |
| `POST` | `/api/account/2fa/disable` | Session + TOTP or backup code |
| `POST` | `/api/account/2fa/backup-codes/regenerate` | Session + TOTP or backup code |
| `POST` | `/api/auth/login/start` | Public (email/password) |
| `POST` | `/api/auth/login/verify-2fa` | Public (challenge token + code) |
| `POST` | `/api/auth/login/verify-2fa-oauth` | Partial OAuth session |

Credentials login: `login/start` → optional `verify-2fa` → one-time `login-token` NextAuth provider. OAuth users (Google, Apple, Microsoft) with 2FA enabled receive a partial session until `verify-2fa-oauth` completes.

**Passkey sign-in bypasses TOTP** when account 2FA is enabled (passkey user verification is sufficient for account authentication).

### Passkey account sign-in and management

Passkeys authenticate the account separately from vault decryption. A passkey unlocks private letters only when it has a valid PRF-based vault envelope.

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/auth/passkey/login/options` | Public |
| `POST` | `/api/auth/passkey/login/verify` | Public |
| `GET` | `/api/account/passkeys` | Session |
| `POST` | `/api/account/passkeys/register` | Session |
| `DELETE` | `/api/account/passkeys/:id` | Session |
| `POST` | `/api/account/passkeys/:id/enable-vault-unlock` | Session (vault unlocked client-side) |

Vault recovery passkeys (PRF envelope while vault unlocked) also use `POST /api/passkeys/register` and `POST /api/passkeys/authenticate` on `/vault/recovery`.

### Email verification and account passwords

Account-only flows — **no private letter content**, **no vault keys**.

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/auth/verify-email/resend` | Public (email in body) or session |
| `POST` | `/api/auth/verify-email/confirm` | Public (`token` in body) |
| `POST` | `/api/auth/forgot-password` | Public (`email`) — generic response |
| `POST` | `/api/auth/reset-password` | Public (`action: validate` \| `reset`, `token`, `newPassword?`) |
| `POST` | `/api/account/change-password` | Session + current password |
| `GET` | `/api/account/auth-status` | Session |

Registration (`POST /api/auth/register`) creates credentials users with `email_verified_at` null and sends a verification email. Password reset updates `password_updated_at` and invalidates older JWT sessions. TOTP remains enabled after password reset.

### Account sessions

Account sessions (sign-in state) are separate from vault unlock.

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/account/sessions` | Session |
| `DELETE` | `/api/account/sessions/:id` | Session |
| `POST` | `/api/account/sessions/revoke-current` | Session — used on sign out |
| `POST` | `/api/account/sessions/revoke-others` | Session |
| `POST` | `/api/account/sessions/revoke-all` | Session |
| `POST` | `/api/account/sessions/ping` | Session |

Responses include masked IP and coarse browser/platform metadata only — never raw session tokens or private letter content.

**Email delivery:** transactional messages use `sendEmail()` with `EMAIL_PROVIDER=console` (dev debug), `smtp` (Mailpit locally or Brevo/staging), or future providers. Emails contain account-auth links only — never private letter content. See `README.md` for Mailpit and Brevo SMTP configuration.

## Security notes

- **Never** send plaintext `title`, `body`, or similar fields — only structured `encrypted*` payloads.
- The OpenAPI spec describes **contracts**, not decrypted content. The server never decrypts private letters.
- Admin routes return metadata only (no letter ciphertext in admin summary responses beyond normal encrypted storage).

## Keeping the spec updated

When adding or changing API routes:

1. Update `docs/openapi.yaml`
2. Verify at `/api-docs` after `npm run dev`
3. Align with `docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md`

Contract tests in `src/test/api/` and security tests should remain the source of truth for behavior; OpenAPI is for human discovery and external tooling.
