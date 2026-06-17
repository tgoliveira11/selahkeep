# Letters → Notes Migration (Option B)

**Status:** Active (Phase 2)  
**Last updated:** 2026-06-17

## Strategy

**Option B — parallel storage with read-only legacy letters:**

| Aspect | Decision |
|--------|----------|
| Legacy `letters` table | **Retained** — existing encrypted rows unchanged |
| Legacy `/api/letters` | **Retained** — read-only for existing clients; no new writes encouraged |
| New `notes` table | **Primary** — all new note CRUD |
| UI routes | `/letters*` **redirect** to `/notes*` equivalents |
| Nav / copy | **"My notes"** — LTG Vault note-centric UX |

## Rationale

- Avoids risky in-place migration of legacy letter ciphertext during Phase 2.
- Existing users keep access to historical letters via legacy API until a future migration tool runs.
- New features (encrypted metadata, vault index, Markdown, soft delete) ship on `notes` only.

## Schema

### `notes` (new)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Client-generated at create |
| `vault_id` | uuid FK → `user_vaults` | Scoped to user's vault |
| `encrypted_metadata` | jsonb | Title, category, tags, answered, dates (encrypted) |
| `encrypted_wrapped_note_key` | jsonb | Note Key wrapped by User Vault Key |
| `encrypted_body` | jsonb | Markdown body |
| `body_encryption_version` | text | `enc-v1` |
| `created_at` | timestamptz | Server default |
| `updated_at` | timestamptz | Server-managed |
| `deleted_at` | timestamptz | Soft delete |

### `letters` (legacy, unchanged)

Remains for historical data. Plaintext `answered` column is legacy-only; new notes store `answered` in encrypted metadata.

## Crypto mapping

| Letter (legacy) | Note (new) |
|-----------------|------------|
| `encrypted_title` | `encrypted_metadata` (title inside JSON) |
| `encrypted_body` | `encrypted_body` (Markdown) |
| `encrypted_letter_key` | `encrypted_wrapped_note_key` |
| `encryption_version` | `body_encryption_version` |
| — | Encrypted vault index on `user_vaults` |

AAD fields: `note_metadata`, `note_body`, `note_key` (letter fields preserved for legacy).

## Routes

| Legacy | Redirect |
|--------|----------|
| `/letters` | `/notes` |
| `/letters/new` | `/notes/new` |
| `/letters/:id` | `/notes/:id` |

Configured in `next.config.ts` (permanent redirect).

## API

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/notes` | List / create notes |
| `GET/PUT/DELETE /api/notes/:id` | Read / update / soft-delete |
| `GET/PATCH /api/vault/index` | Encrypted vault index blob |

Legacy `GET /api/letters` remains for read-back of old letters.

## Future migration (not Phase 2)

A one-shot or background tool may:

1. Decrypt each legacy letter client-side (vault unlocked).
2. Re-encrypt as a note with metadata + index entry.
3. Mark legacy letter as migrated (future column or audit flag).

```text
TODO_SECURITY_REVIEW_REQUIRED:
Bulk letters→notes migration must be human-reviewed before production rollout.
```

## User communication

- Nav shows **My notes**; `/letters` redirects transparently.
- Legacy letters are not shown in the notes list (separate data). Users with only legacy letters see an empty notes list until they write a new note or run a future migration.
