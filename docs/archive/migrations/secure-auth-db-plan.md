> **Archived historical document.** Not an active architecture or source-of-truth document.
> Current source of truth: `docs/TDR_LTG_Vault_MVP.md`, `docs/ADR-005_*`, `docs/ADR-006_*`.


# Secure-Auth Database Plan

### Current layout

- **Package schema:** `@tgoliveira/secure-auth/drizzle/schema` — re-exported from `src/lib/db/schema.ts`
- **App schema:** `src/lib/db/app-schema.ts` — letters, vault, trusted devices, vault-extended `passkeyCredentials`
- **Merged client:** `src/lib/db/index.ts` — package tables + app tables (app `passkeyCredentials` overrides package definition)

## Strategy

### Development / greenfield

1. Ensure PostgreSQL is running (`docker compose up -d`).
2. Package auth migrations are validated via `npm run db:check-auth` (`scripts/check-auth-db.mjs`).
3. App migrations in `./drizzle` cover product tables via `npm run db:migrate`.
4. Auth table DDL should not be duplicated in new app migrations — rely on package schema alignment.

### Existing database (this repo)

Auth tables were created by earlier app migrations (`0001`–`0005` range). Column shapes were aligned with the package `authSchema` during integration. **Do not** run blind drops on production.

Forward-only steps:

1. Backup database before any auth schema change.
2. Compare local `src/lib/db/schema.ts` auth exports with `authSchema` from the package (use `db:check-auth`).
3. Remove duplicate auth table definitions from `src/lib/db/schema.ts` only after:
   - All auth reads/writes go through package services or `secureAuthDb`.
   - Product repositories no longer import local auth table symbols.
4. Optional: point `drizzle.config.ts` schema at package + app-only schema module (future).

### drizzle-kit

Current `drizzle.config.ts` uses `./src/lib/db/schema.ts` for app migrations. Package migrations live in `node_modules/@tgoliveira/secure-auth/migrations/` — applied/verified by `db:check-auth`, not duplicated into `./drizzle`.

Recommended production CI order:

```bash
npm ci
npm run db:migrate      # product tables
npm run db:check-auth   # verify auth tables match package
```

### Rollback

Package migrations are forward-only. Roll back by restoring a DB snapshot or writing compensating SQL — not by reversing package files.

## Data migration (if user shape diverges)

If production users table columns differ from package `users`:

1. Export snapshot.
2. Write one-off SQL to map columns (ids, email, password hash, verification flags).
3. Validate with staging + `db:check-auth`.
4. Document script in this file before production run.

No production data migration script is required for current dev schema alignment.
