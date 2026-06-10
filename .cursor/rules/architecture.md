# Architecture Rules

- Follow layer boundary: UI -> Crypto Client -> API Client -> API Route -> Service -> Repository -> PostgreSQL.
- Only `src/lib/crypto-client` handles plaintext letter title/body.
- React components must not import from `src/lib/db`, `src/server/repositories`, or ORM clients.
- All private letter persistence through explicit `/api/*` routes.
- User-owned queries scoped by authenticated user ID.
- Physical deletion for letters (no soft delete).
