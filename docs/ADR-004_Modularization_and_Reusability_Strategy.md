# ADR-004 — Modularization and Reusability Strategy

## Status

**Status:** Accepted — Phase 1 complete; Phase 2 (pure internal utilities) complete

**Decision type:** Architecture / Code Organization / Future Reusability

**Applies to:** Private Letters Vault MVP

**Primary stack:** Next.js, TypeScript, PostgreSQL, Drizzle, Auth.js/NextAuth, React

**Decision:** Adopt an internal modular monolith architecture before extracting reusable packages.

## Context

The Private Letters Vault MVP has grown beyond a simple proof of concept.

The application now includes several mature account and security capabilities:

- email/password authentication
- Google and Apple OAuth
- passkey authentication
- TOTP two-factor authentication
- email verification
- forgot/reset password
- change password
- account deletion
- account session management
- trusted devices
- vault unlock
- passkey PRF-based vault unlock
- recovery codes
- rate limiting
- audit logs
- safe logging/redaction
- email provider abstraction
- UI design system
- account/security UI flows
- PostgreSQL migrations
- extensive tests
- documentation and Cursor/agent rules

Many of these capabilities could be useful in future products. However, not all of them are equally reusable.

Some modules are generic account/security infrastructure. Others are deeply specific to the Private Letters Vault product and its end-to-end encryption model.

This ADR defines how the codebase should be modularized, what should remain product-specific, what may later become reusable, and which phases should be followed.

## Problem

The current codebase contains reusable security/account functionality mixed with product-specific vault and letter functionality.

There is a legitimate desire to reuse parts of this work in future projects. However, extracting everything into reusable packages too early creates risks:

1. **Premature abstraction** — The product is still evolving. Public package APIs may stabilize too early around incomplete assumptions.
2. **Security boundary confusion** — Authentication, account sessions, passkeys, vault unlock, trusted devices, and recovery codes are related but not the same thing. Poor extraction could blur these lines.
3. **Over-generalization** — The app is currently optimized for a specific stack: Next.js, Auth.js/NextAuth, PostgreSQL, Drizzle, React, and a browser-based E2EE vault.
4. **Increased build/deployment complexity** — Extracting packages too early can introduce monorepo complexity, versioning, cross-package builds, dependency coupling, and harder CI.
5. **False sense of portability** — Authentication and account systems are highly contextual. They depend on session strategy, cookies, database schema, email providers, rate limits, audit requirements, deployment environment, and security policy.
6. **Product velocity risk** — The MVP still needs validation. Over-investing in reusable packages may slow product development before the core product is validated.

## Decision

The project will adopt a **modular monolith** approach first.

The application will remain a single deployable Next.js app, but the codebase will be reorganized into clearly bounded internal modules.

Reusable concerns will be isolated internally first.

External package extraction will only be considered after:

1. the MVP stabilizes
2. the same module is needed by at least one additional real project
3. the module boundary is proven by internal use
4. security-critical APIs are reviewed
5. tests and documentation are mature enough for reuse

## Core Architectural Principle

The codebase should be modularized around **business/security capabilities**, not around technical layers alone.

Instead of organizing everything only by `components`, `lib`, `server`, and `features`, the system should make domain boundaries explicit.

Recommended direction:

```text
src/modules/auth
src/modules/account
src/modules/sessions
src/modules/two-factor
src/modules/passkeys
src/modules/email
src/modules/audit
src/modules/rate-limit
src/modules/security
src/modules/vault
src/modules/letters
src/modules/ui
```

Each module may contain its own:

- `api`
- `services`
- `repositories`
- `components`
- `hooks`
- `policies`
- `schemas`
- `tests`
- `docs`

The exact folder structure may evolve, but boundaries must remain explicit.

## What Should Be Reusable

The following capabilities are good candidates for internal modularization and future reuse.

### Highly Reusable Utility Modules

These modules are generic and low-risk to reuse:

- security utilities
- safe logger / redaction
- password policy
- email provider abstraction
- rate limit abstraction
- audit event infrastructure
- IP masking / IP hashing
- user-agent parsing
- session metadata formatting
- basic UI components
- form components
- confirmation dialogs
- loading/error/empty states

Potential future packages:

- `packages/security-utils`
- `packages/email`
- `packages/rate-limit`
- `packages/audit`
- `packages/ui`

These are the best first extraction candidates after internal stabilization.

### Reusable but Stack-Coupled Modules

These modules are reusable only for projects using a similar stack:

- email/password authentication
- OAuth account handling
- email verification
- forgot/reset password
- change password
- TOTP two-factor authentication
- account sessions
- session revocation
- account deletion
- passkey account authentication
- account settings UI
- security audit UI

These should be modularized internally first. They may later become a Next.js/Auth.js/PostgreSQL starter or stack-specific package, but not a universal auth library.

Potential future package or starter:

- `secure-next-account-starter`
- or `packages/next-account-kit`

Scope would be explicitly limited to:

```text
Next.js + Auth.js/NextAuth + PostgreSQL + Drizzle + React
```

### Product-Specific Modules

These should remain product-specific for now:

- private letters
- letter editor
- letter list
- answered status
- private letter UX
- User Vault Key
- Letter Key
- encrypted letters
- vault unlock
- trusted devices for vault unlock
- recovery code for vault recovery
- passkey PRF-based vault envelope
- private letter recovery UX
- future anonymous sharing
- future community prayer
- future moderation
- spiritual product copy

These are tied to the Private Letters Vault product and must not be extracted into a generic auth/account package.

## Critical Boundary: Authentication vs Vault

The most important modular boundary is:

```text
account authentication ≠ vault decryption
```

The auth/account modules may know:

- user identity
- account session
- login method
- email verification
- 2FA status
- passkey credential for authentication
- account deletion
- session revocation

The vault module may know:

- User Vault Key
- Letter Keys
- vault envelopes
- trusted devices for vault unlock
- recovery code for vault recovery
- passkey PRF-based vault unlock
- encrypted private letters

**Rules:**

- The auth module must not decrypt vault data.
- The account module must not possess vault keys.
- The session module must not unlock private letters.
- The passkey authentication module may authenticate the user, but vault unlock requires a separate PRF-based envelope handled by the vault/passkey-vault boundary.

**Required rule:**

A passkey may authenticate the account. The same passkey may unlock the vault only when it has a valid vault envelope created with a reviewed PRF-based mechanism. Otherwise, the user is signed in, but the vault remains locked.

## Proposed Module Boundaries

### auth Module

**Responsible for:**

- email/password login
- OAuth login
- passkey login
- auth callbacks
- auth provider integration
- authentication policy
- login rate limits
- login UI

**Must not:**

- decrypt vault
- access private letter plaintext
- manage Letter Keys
- manage User Vault Key

### account Module

**Responsible for:**

- account settings
- email verification
- forgot/reset password
- change password
- account deletion
- account profile metadata
- auth status display

**Must not:**

- unlock vault
- rotate vault keys
- recover letters
- access private letter content

### sessions Module

**Responsible for:**

- active account sessions
- session metadata
- session revocation
- revoke all sessions
- last-used tracking
- IP masking/hash
- user-agent metadata

**Must not:**

- manage trusted devices
- unlock vault
- decrypt letters

**Important distinction:**

```text
Account session:  proves the user is currently signed in.
Trusted device:   browser storage profile that may unlock the private letters vault.
```

### two-factor Module

**Responsible for:**

- TOTP setup
- TOTP verification
- backup codes, if implemented
- TOTP disable flow
- TOTP login challenge for password-based login

**Must not:**

- unlock vault
- replace recovery code
- decrypt letters
- access User Vault Key

TOTP is account authentication only.

### passkeys Module

**Responsible for:**

- WebAuthn credential registration
- passkey account authentication
- challenge creation and atomic consumption
- passkey removal
- passkey metadata
- sign-in-only vs sign-in + vault-unlock labels

**Must not directly decrypt vault.**

The passkeys module may expose verified PRF capability and credential metadata to the vault module through a reviewed interface.

### vault Module

**Responsible for:**

- User Vault Key lifecycle
- vault unlock
- vault lock
- vault session
- recovery code for vault
- trusted devices for vault unlock
- PRF-based passkey vault envelopes
- encrypted vault envelopes
- offline trusted-device unlock limitation

**May depend on:**

- auth identity
- passkey PRF output
- account user ID

**Must not depend on:**

- letter product UI copy
- community features
- public feed

### letters Module

**Responsible for:**

- private letter creation
- private letter list
- private letter editor
- private letter detail
- answer status
- letter deletion
- encryption/decryption integration through vault/crypto-client

**Must not:**

- bypass vault encryption
- send plaintext to backend
- access DB directly from frontend

### email Module

**Responsible for:**

- email provider abstraction
- console provider
- SMTP provider
- future Resend/SendGrid/Brevo providers
- account verification email templates
- password reset email templates

**Must not:**

- send private letter content
- log tokens in production
- store tokens

### audit Module

**Responsible for:**

- audit event definitions
- audit persistence
- audit sanitization
- safe audit metadata

**Must not:**

- store private letter content
- store secrets
- store raw tokens
- store vault keys

### rate-limit Module

**Responsible for:**

- rate limit interface
- in-memory adapter for local/test
- PostgreSQL adapter
- future Redis/Upstash adapter
- operation-specific rate limit policies

**Must not:**

- contain product-specific UI logic
- know about letter plaintext
- log sensitive values

### security Module

**Responsible for:**

- safe logger
- redaction
- token hashing
- IP hashing
- password policy
- security helpers
- environment validation
- test helpers for security boundaries

### ui Module

**Responsible for reusable UI components:**

- Button
- Input
- Textarea
- Card
- Alert
- Badge
- PageHeader
- EmptyState
- LoadingState
- ErrorState
- SuccessState
- ConfirmDialog
- FormField
- PrivacyNotice
- RecoveryNotice

Must remain domain-neutral when possible. Domain-specific UI should stay in its module.

## Dependency Rules

The following dependency direction should be enforced:

```text
ui
security
email
audit
rate-limit
auth
account
sessions
two-factor
passkeys
vault
letters
```

Recommended dependency principles:

1. `ui` must not depend on product modules.
2. `security` must not depend on product modules.
3. `email` must not depend on vault or letters.
4. `audit` must not store or depend on private content.
5. `auth` must not depend on vault or letters.
6. `account` must not depend on letters.
7. `sessions` must not depend on vault.
8. `two-factor` must not depend on vault.
9. `passkeys` may expose account authentication; vault-specific PRF envelope handling belongs to vault or a reviewed integration boundary.
10. `letters` may depend on vault client capabilities.
11. `vault` must not depend on letters UI.

## Suggested Directory Structure — Phase 1

Phase 1 should not create external packages.

Recommended structure:

```text
src/modules
  /auth
    /api
    /components
    /services
    /repositories
    /schemas
    /tests
  /account
    /api
    /components
    /services
    /repositories
    /schemas
    /tests
  /sessions
    /api
    /components
    /services
    /repositories
    /schemas
    /tests
  /two-factor
    /api
    /components
    /services
    /repositories
    /schemas
    /tests
  /passkeys
    /api
    /components
    /services
    /repositories
    /schemas
    /tests
  /email
    /services
    /providers
    /templates
    /schemas
    /tests
  /audit
    /services
    /repositories
    /schemas
    /tests
  /rate-limit
    /policies
    /adapters
    /tests
  /security
    /logger
    /tokens
    /password-policy
    /ip
    /user-agent
    /tests
  /vault
    /api
    /components
    /crypto-client
    /services
    /repositories
    /schemas
    /tests
  /letters
    /api
    /components
    /services
    /repositories
    /schemas
    /tests
  /ui
    /components
    /layout
    /tests
```

Next.js route files may remain under `src/app`, but should delegate to module-level handlers/services.

Example:

```text
src/app/api/account/change-password/route.ts
  -> imports handler/service from src/modules/account
```

This keeps Next.js routing compatible while moving business logic into modules.

## Phase Plan

### Phase 1 — Internal Modular Monolith

**Goal:** Reorganize the current codebase into explicit internal modules without changing runtime behavior.

**Scope:**

- no external packages
- no monorepo yet
- no package publishing
- no major logic redesign
- preserve current API behavior
- preserve current database schema unless strictly needed
- preserve security boundaries
- preserve tests
- improve import boundaries

**Deliverables:**

1. Create `src/modules`.
2. Move account/auth/security-related code into modules.
3. Move vault/letters code into product-specific modules.
4. Update imports.
5. Add module boundary documentation.
6. Add tests/guards to prevent forbidden dependencies.
7. Keep all existing tests passing.
8. Keep or improve coverage.
9. Update architecture docs and Cursor rules.

**Success criteria:**

- Codebase has clear module boundaries.
- No behavior regression.
- No security boundary regression.
- `npm run lint` passes.
- `npm run test` passes.
- `npm run test:coverage` passes.
- `npm run build` passes.
- API routes remain explicit.
- Frontend does not access DB directly.
- Auth/account modules do not import vault/letters internals.
- Vault/letters modules remain product-specific.

### Phase 2 — Extract Pure Internal Utilities

**Goal:** Identify and isolate modules that are genuinely reusable and mostly stack-independent.

**Candidate modules:**

- security utilities
- safe logger
- redaction
- password policy
- token hashing
- email provider abstraction
- rate-limit abstraction
- audit event helpers
- IP masking
- user-agent parsing
- UI primitives

**Scope:**

- still inside the same repository
- may introduce `src/packages` or `packages` only if beneficial
- no public publishing
- no external consumer required yet

**Success criteria:**

- Utility modules have clean APIs.
- Utility modules have minimal dependencies.
- Utility modules do not depend on Next.js route handlers.
- Utility modules do not depend on product-specific vault/letters code.
- Tests are module-local and reusable.

**Phase 2 outcome (implemented):**

- Utilities organized under `core/`, `adapters/`, `primitives/` inside existing `src/modules/*` modules.
- Inventory: `docs/UTILITY_EXTRACTION_INVENTORY.md`.
- No `packages/` directory; no npm publishing.
- Vault/letters remain product-specific; `PrivacyNotice` / `RecoveryNotice` moved to `vault/components`.

### Phase 3 — Create a Reusable Starter or Internal Template

**Goal:** Create a reusable starter/template for future projects using the same stack.

**Recommended direction:** `secure-next-account-starter`

**Scope:**

- Next.js
- Auth.js/NextAuth
- PostgreSQL
- Drizzle
- React
- email verification
- forgot/reset password
- TOTP
- passkey login
- session management
- account deletion
- audit logs
- rate limiting
- Mailpit
- SMTP/Brevo support
- security docs
- Cursor rules
- tests

**Why starter instead of library:** Authentication/account systems are deeply integrated with app routing, database schema, cookies, deployment, email providers, and UI flows. A starter/template is more practical than a generic library at this stage.

**Success criteria:**

- A new project can start from the template.
- Security docs and agent rules are included.
- Database migrations are included.
- The template has working tests.
- Product-specific vault/letters logic is excluded.

### Phase 4 — Extract Packages Only After a Second Real Consumer

**Goal:** Only extract packages when reuse is proven by at least one additional real project.

**Potential packages:**

- `@org/security-utils`
- `@org/email`
- `@org/rate-limit`
- `@org/audit`
- `@org/ui`
- `@org/next-account-kit`

**Extraction requirements** (before extracting any package):

1. At least two real apps need it.
2. API boundaries are stable.
3. Package has independent tests.
4. Package has documentation.
5. Package has security review if auth-related.
6. Package does not include product-specific vault/letters logic.
7. Versioning and changelog process are defined.

## What Must Not Be Extracted Yet

Do not extract the following into a generic package during Phase 1 or Phase 2:

- User Vault Key lifecycle
- Letter Key lifecycle
- encrypted letters
- private letter editor
- vault recovery code
- trusted devices for vault unlock
- passkey PRF vault envelope
- community prayer
- anonymous sharing
- spiritual copy
- letter moderation

These remain inside the Private Letters Vault product.

## Testing Strategy

Each module should have tests close to its boundary.

**Recommended categories:**

- unit tests
- service tests
- API route tests
- security boundary tests
- UI tests
- integration tests where needed

**Required boundary tests:**

1. auth must not import vault or letters.
2. account must not import letters.
3. sessions must not import vault.
4. two-factor must not import vault.
5. frontend components must not import database clients.
6. private letter APIs must not accept plaintext fields.
7. vault code must not leak keys into logs.
8. email code must not send private letter content.
9. audit logs must not include secrets or private content.
10. passkey account authentication must remain distinct from passkey vault unlock.

## Documentation Requirements

Add or update:

- `/docs/ADR-004_Modularization_and_Reusability_Strategy.md`
- `/docs/MODULE_BOUNDARIES.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `AGENTS.md`
- `.cursor/rules/architecture.md`
- `.cursor/rules/security.md`
- `.cursor/rules/testing.md`

Documentation must include:

- module list
- responsibility of each module
- forbidden dependencies
- authentication vs vault distinction
- account sessions vs trusted devices distinction
- what is reusable
- what is product-specific
- phase plan
- extraction criteria

## Consequences

### Positive

- clearer boundaries
- easier future reuse
- safer Cursor/agent work
- less coupling between account/security and vault/letters
- improved maintainability
- easier onboarding
- cleaner testing
- future extraction becomes possible

### Negative

- refactor cost
- many import path changes
- risk of temporary churn
- possible merge conflicts
- no immediate external package
- requires discipline to maintain boundaries

## Alternatives Considered

### Alternative 1 — Extract Packages Immediately

**Rejected for now.**

**Reason:**

- too early
- product still evolving
- security-sensitive APIs not stable
- risk of premature abstraction
- slows MVP validation

### Alternative 2 — Keep Current Structure

**Rejected.**

**Reason:**

- growing complexity
- reusable account/security functionality is mixed with product-specific vault logic
- future agents may accidentally break boundaries
- harder to reuse later

### Alternative 3 — Full Monorepo Now

**Rejected for Phase 1.**

**Reason:**

- unnecessary complexity at current stage
- modular monolith gives most benefits with lower cost

### Alternative 4 — Create a Starter Template Now

**Deferred to Phase 3.**

**Reason:**

- the current product should stabilize first
- the starter should be created after the account/auth modules prove stable internally

## Final Decision

The project will adopt a phased modularization strategy.

Immediate implementation should focus only on **Phase 1: Internal Modular Monolith**.

- No external packages should be created yet.
- No monorepo migration should happen yet.

The code should be reorganized into clear modules while preserving behavior, security boundaries, tests, and current deployment model.

The long-term target is to enable reuse through a starter/template and eventually packages, but only after proven need and stable boundaries.

## Summary

The correct path is:

```text
Now:
  modularize internally
Next:
  isolate pure utilities
Later:
  create a secure Next.js account/auth starter
Only after reuse is proven:
  extract packages
```

**Guiding principle:** Reuse without generalizing too early.

**Most reusable areas:**

- auth
- account
- sessions
- two-factor
- passkeys for login
- email
- audit
- rate-limit
- security utilities
- UI primitives

**Product-specific areas that must remain in the app:**

- encrypted private letters
- vault unlock
- trusted devices for vault unlock
- vault recovery code
- passkey PRF vault envelope
- letters UX
- future community features

The goal is not to create a library now. The goal is to create a maintainable, secure, modular foundation that can later become reusable.
