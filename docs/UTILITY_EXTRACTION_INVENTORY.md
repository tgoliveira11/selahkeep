# Utility Extraction Inventory — Phase 2

**Status:** Phase 2 complete (internal utilities only — no external packages, no monorepo).

Phase 2 isolates pure internal utilities inside `src/modules/*` subfolders. Vault and letters remain product-specific.

## Classification legend

| Action | Meaning |
|--------|---------|
| **Extract now** | Moved to a utility subfolder with public module API |
| **Keep in domain** | Stays in vault/notes by design |
| **Defer** | Future phase (stack-coupled starter or package) |
| **Do not extract** | Product-specific; must not become generic utility |

## Security utilities

| Utility | Prior location | Target | Action | Notes |
|---------|----------------|--------|--------|-------|
| Safe logger / redaction | `security/logger.ts` | `security/logger/` | Extract now | No vault/notes plaintext imports |
| Load env | `security/load-env.ts` | `security/env/` | Extract now | Dev/test helper |
| Password policy | `security/password-policy.ts` | `security/password-policy/` | Extract now | Client + server safe |
| Request IP | `security/request-ip.ts` | `security/ip/request-ip.ts` | Extract now | Next.js request helper |
| IP mask/hash | `sessions/lib/session-ip.ts` | `security/ip/session-ip.ts` | Extract now | Display + audit hashing |
| User-agent parse/hash | `sessions/lib/user-agent-metadata.ts` | `security/user-agent/metadata.ts` | Extract now | Session metadata only |
| Email scope hash | `email/email-scope.ts` | `security/scopes/email-scope.ts` | Extract now | Rate-limit key peppering |
| Token hashing (login) | `security/policies/login-token.ts` | unchanged | Keep in domain | Auth-coupled opaque tokens |
| Password hashing | `security/policies/password-hashing.ts` | unchanged | Extract now | Generic bcrypt helper |
| Plaintext rejection | `security/policies/plaintext-rejection.ts` | unchanged | Keep in domain | Letter API enforcement |
| AAD validation | `security/policies/aad-validation.ts` | Keep in domain | Product crypto binding |

## Email utilities

| Utility | Prior location | Target | Action | Notes |
|---------|----------------|--------|--------|-------|
| `sendEmail` interface | `email/send-email.ts` | `email/core/` | Extract now | Provider-agnostic |
| SMTP provider | `email/smtp-provider.ts` | `email/core/` | Extract now | Nodemailer adapter |
| Email config | `email/config.ts` | `email/core/` | Extract now | Env parsing |
| Account verification/reset templates | `email/account-email-templates.ts` | `email/templates/` | Keep in domain | Account-auth copy only |
| Public API | `email/index.ts` | core only | Extract now | Templates via `email/templates` |

## Rate limit utilities

| Utility | Prior location | Target | Action | Notes |
|---------|----------------|--------|--------|-------|
| Types / key builder / policies | `rate-limit/types.ts` | `rate-limit/core/` | Extract now | Pure interface |
| In-memory adapter | `rate-limit/in-memory-adapter.ts` | `rate-limit/adapters/` | Extract now | Test/local |
| PostgreSQL adapter | `rate-limit/postgres-adapter.ts` | `rate-limit/adapters/` | Extract now | Production |
| `enforceRateLimit` facade | `rate-limit/index.ts` | unchanged | Keep in domain | Server-only wiring |

## Audit utilities

| Utility | Prior location | Target | Action | Notes |
|---------|----------------|--------|--------|-------|
| Metadata sanitization | `audit/policies/audit-sanitization.ts` | `audit/core/` | Extract now | No letter plaintext |
| Audit repository | `audit/repositories/` | unchanged | Keep in domain | Drizzle adapter |

## UI primitives

| Utility | Prior location | Target | Action | Notes |
|---------|----------------|--------|--------|-------|
| Button, Input, Card, Alert, … | `ui/components/` | `ui/primitives/` | Extract now | Domain-neutral |
| `cn`, brand mark, main-content | `ui/lib/` | unchanged | Extract now | Layout tokens |
| PrivacyNotice | `ui/components/` | `vault/components/` | Do not extract | Private letter product copy |
| RecoveryNotice | `ui/components/` | `vault/components/` | Do not extract | Vault recovery copy |

## Intentionally left in domain modules

| Area | Why |
|------|-----|
| `auth`, `account`, `sessions`, `two-factor`, `passkeys` | Stack-coupled account flows — Phase 3 starter candidate |
| `vault`, `letters` | Product-specific E2EE and spiritual UX |
| `sessions/lib/device-display-info.ts` | Account session display; uses security user-agent |
| `sessions/lib/session-config.ts` | NextAuth session TTL alignment |
| `security/policies/plaintext-rejection.ts` | Enforces letter plaintext rejection at API boundary |

## Public internal APIs

| Module | Entry | Exports |
|--------|-------|---------|
| Security | `@/modules/security` | logger, env, password policy, IP, user-agent, scopes, hashing policies |
| Email core | `@/modules/email` | sendEmail, SMTP, config |
| Email templates | `@/modules/email/templates` | account verification/reset templates |
| Rate limit | `@/modules/rate-limit` | enforce/check/reset + types |
| Audit | `@/modules/audit` | sanitization + repository |
| UI primitives | `@/modules/ui` | primitives + layout helpers |

Legacy shims remain at Phase 1 paths (`src/lib/*`, `src/server/*`, `src/components/ui/*`, module-level prior paths) during migration.

## Phase 2 debt

- Deep imports via shims still common in routes and tests — prefer `@/modules/*` public APIs in new code.
- `audit-repository` still imports sanitization through `src/server/policies` shim.
- Rate-limit and email facades remain server-only (`server-only` / Drizzle).

See `docs/MODULE_BOUNDARIES.md`.
