# Internal Modules

This project uses an **internal modular monolith** per `docs/ADR-004_Modularization_and_Reusability_Strategy.md`.

## Phase status

- **Phase 1:** domain modules under `src/modules/*` with legacy shims.
- **Phase 2:** pure utilities organized in `core/`, `adapters/`, `primitives/` subfolders (see `docs/UTILITY_EXTRACTION_INVENTORY.md`).
- **No external packages or monorepo** — utilities remain internal until Phase 4 criteria are met.

## Utility modules (Phase 2)

| Module | Pure utility areas |
|--------|-------------------|
| `security` | logger, env, password policy, IP, user-agent, scopes, hashing |
| `email` | `core/` provider infrastructure; `templates/` account-auth emails |
| `rate-limit` | `core/` types; `adapters/` memory/postgres |
| `audit` | `core/` sanitization; `repositories/` persistence |
| `ui` | `primitives/` only (product copy lives in `vault/components`) |

## Product modules

`vault` and `letters` remain product-specific (E2EE, recovery, private letter UX).

See `docs/MODULE_BOUNDARIES.md` for forbidden dependencies.
