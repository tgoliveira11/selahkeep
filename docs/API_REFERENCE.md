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

The `/api-docs` page intentionally **does not use the app navigation shell** (`Nav` / `PageLayout`) so Swagger UI can use the full viewport. It still inherits the root skip link and sets `id="main-content"` on its `<main>`. See `ARCHITECTURE.md` for rationale.

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

Registration (`POST /api/auth/register`) and NextAuth OAuth/credentials flows are documented in ADR-003; interactive OAuth is easier through the web login page than Swagger.

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

Credentials login: `login/start` → optional `verify-2fa` → one-time `login-token` NextAuth provider. OAuth users with 2FA enabled receive a partial session until `verify-2fa-oauth` completes.

## Security notes

- **Never** send plaintext `title`, `body`, or similar fields — only structured `encrypted*` payloads.
- The OpenAPI spec describes **contracts**, not decrypted content. The server never decrypts private letters.
- Admin routes return metadata only (no letter ciphertext in admin summary responses beyond normal encrypted storage).

## Keeping the spec updated

When adding or changing API routes:

1. Update `docs/openapi.yaml`
2. Verify at `/api-docs` after `npm run dev`
3. Align with `docs/ADR-003_API_Contract_Database_Schema_No_Plaintext_Enforcement.md`

Contract tests in `src/test/api/` and security tests should remain the source of truth for behavior; OpenAPI is for human discovery and external tooling.
