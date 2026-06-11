# Internal Modules (Phase 1)

This project uses a **modular monolith** layout per `docs/ADR-004_Modularization_and_Reusability_Strategy.md`.

- No external packages or monorepo in Phase 1.
- Next.js routes remain under `src/app/api` and delegate to module services.
- Legacy import paths under `src/lib`, `src/server`, and `src/components/ui` may re-export from `src/modules/*` during migration.

See `docs/MODULE_BOUNDARIES.md` for responsibilities and forbidden dependencies.
