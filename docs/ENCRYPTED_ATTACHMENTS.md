# Encrypted attachments — SelahKeep

## Model

Attachments are encrypted **on the client** with the note's **Note Key** before upload.

| Layer | Stored |
|-------|--------|
| Server | `note_attachments` row: encrypted metadata JSON, encrypted blob JSON, ciphertext byte count, timestamps |
| Never on server | Filename, MIME type, file bytes (plaintext) |

### AAD binding

- Metadata: `note_attachment_metadata` → attachment id
- Blob: `note_attachment_blob` → attachment id
- Wrapped note key unchanged (note id)

## Limits (env)

| Variable | Default |
|----------|---------|
| `MAX_ATTACHMENT_SIZE_MB` | 10 |
| `MAX_ATTACHMENTS_PER_NOTE` | 10 |
| `MAX_TOTAL_STORAGE_MB` | 100 |

## Client allowlist

Executable and script types are blocked before encryption. See `src/lib/notes/attachment-file-types.ts`.

## API

- `GET/POST /api/notes/:id/attachments`
- `GET/DELETE /api/notes/:id/attachments/:attachmentId`
- `GET /api/vault/storage-usage`

Plaintext rejection: filename, mimeType, blob, content fields on API bodies.

## UI

- Create/edit: upload, list, remove, progress
- Detail (unlocked): download; inline preview when the browser can render the type (images, PDF, text, audio, video); hidden when vault locked
- Detail rail: **Attachments** card between **Details** and **Version history** — row layout with file badge, name, size, download; hover opens a 50% viewport preview popover when the type supports it (no preview button)
- Previews decrypt in the browser only; blob URLs are revoked on hide/unmount (nothing persisted)
- CSP allows `blob:` for `img-src`, `frame-src` (PDF), and `media-src` so previews can render decrypted bytes
- Office archives (`.docx`, `.xlsx`, etc.) remain download-only
- New note: pending files encrypted and uploaded after first save

Migration: `drizzle/0013_note_attachments.sql`
