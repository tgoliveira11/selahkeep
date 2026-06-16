# Testing Strategy

Last updated: 2026-06-16

## Overview

All automated tests run through **Vitest** (`npm run test`, `npm run test:coverage`). Browser **E2E tests (Playwright) were removed** — they previously lived under `e2e/` and are no longer part of CI or local workflows.

`npm run test:all` is an alias for `npm run test:coverage`.

## Coverage gate

- **Minimum: 90%** lines, statements, functions, and branches on enforced scope (`vitest.config.ts`).
- Run `npm ci && npm run lint && npm run test:coverage && npm run build` before merging.

## Test layers

| Layer | Location | Purpose |
|-------|----------|---------|
| **Unit** | `src/test/unit/` | Pure helpers, crypto, validation, clients, env |
| **Security** | `src/test/security/` | Plaintext rejection, boundaries, sentinel phrase, module guards |
| **Services** | `src/test/services/` | Business logic with mocked repositories |
| **API** | `src/test/api/` | Route handlers with mocked auth + services |
| **Features** | `src/test/features/` | Client flows (passkey unlock, layout shell, UI pages, accessibility) |

Repository adapters and most page components are covered indirectly via service/API/feature tests unless a change adds testable logic in those layers.

## Layout and shell tests

`src/test/features/site-layout.test.tsx` verifies:

- Public home renders header navigation and footer inside `SiteShell`
- Footer attribution text, URL, `target="_blank"`, and `rel="noopener noreferrer"`
- Auth package login still renders within the shell
- Mobile menu accessible name when signed in
- `package.json` has no removed E2E scripts

`src/test/features/accessibility.test.tsx` runs axe on the landing page with `SiteShell`.

## Security tests

See `.cursor/rules/testing.md` for the full checklist (sentinel phrase, IndexedDB, passkeys, account sessions, 2FA, etc.).

Sentinel phrase: `SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345` must never appear in database records, API responses, logs, or admin endpoints.

## What was removed

| Item | Notes |
|------|-------|
| `e2e/` directory | Playwright specs and helpers |
| `playwright.config.ts` | Playwright configuration |
| `test:e2e`, `test:e2e:ui` scripts | Removed from `package.json` |
| `@playwright/test` dependency | Removed from devDependencies |

Vitest, Testing Library, jest-axe, and happy-dom remain in use.

## Local commands

```bash
npm ci
npm run lint
npm run test
npm run test:coverage
npm run build
```
