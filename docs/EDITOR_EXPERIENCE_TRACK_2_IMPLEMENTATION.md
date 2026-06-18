# Editor Experience — Priority Track 2 Implementation

SelahKeep note writing uses **Tiptap 3 + tiptap-markdown** for visual editing with **Markdown as the canonical encrypted body format**.

## Current editor stack

| Piece | Location |
|-------|----------|
| Orchestrator | `src/features/notes/markdown-editor.tsx` |
| Visual editor | `src/features/notes/visual-note-editor.tsx` |
| Markdown/source | `src/features/notes/markdown-expert-editor.tsx` |
| Toolbar + quick insert | `src/components/notes/editor-toolbar.tsx`, `editor-quick-insert.tsx` |
| Extensions | `src/features/notes/note-editor-extensions.ts` |
| Sanitization | `src/features/notes/sanitize-markdown.ts`, `src/lib/notes/editor-paste.ts` |

**No new dependency added** in Track 2 — existing Tiptap stack extended.

## Visual vs Markdown mode

- **Default:** visual editor on `/notes/new` and `/notes/[id]` edit mode.
- **Toggle:** toolbar **Markdown** button (`Visual` / `Markdown` labels).
- **Storage:** `encryptNote` / `updateNote` receive plaintext only in browser memory; API gets encrypted payloads only.
- **Round-trip:** `tiptap-markdown` serializes visual content to Markdown before save; conversion warnings via `markdown-roundtrip.ts`.

## Supported formatting

Bold, italic, H1, H2, quote, bulleted list, checklist, link (https only), inline code. Ordered list and code blocks remain available via StarterKit / Markdown source.

## Save and draft status

`EditorStatusBar` states: `unsaved`, `saving`, `saved`, `draft-saved`, `save-failed`, `idle`.

- Save success shows **Saved** briefly on edit page after encrypted persistence.
- Save failure keeps dirty state and shows **Save failed** in the status bar.
- Autosave sets **Draft saved on this device** (encrypted IndexedDB drafts).

## Encrypted local drafts

`src/lib/crypto-client/note-drafts.ts` — AES-GCM encrypted payloads in IndexedDB (`encrypted_note_drafts`); field AAD `note_draft`. Plaintext title/body/category/tags never persisted at rest.

Restore/discard banners on new and edit pages. Drafts cleared on successful save. Vault lock clears in-memory editor state via `subscribeVaultSession`.

## Templates

14 local templates in `src/lib/notes/note-templates.ts` (no server table). Selector on `/notes/new`; header **New note ▾** menu can open `/notes/new?template=<id>` for core templates. Replace confirmation when body has content.

**Template categories (refinement):** Non-blank templates assign a locked category matching the template name (e.g. Prayer → category Prayer), created/reused via encrypted vault index. Blank note does not auto-create a category. Category is read-only during creation when assigned by template.

**Autosave activation (refinement):** Encrypted autosave and unsaved-change warnings start only after user-originated edits (title, body, tags, manual category). Template prefill alone does not activate autosave.

## Quick insert menu

`+ Insert` toolbar control inserts Markdown snippets at cursor (visual + source modes) via `src/lib/notes/quick-insert-snippets.ts`.

## Focus mode

`NoteFocusModeToggle` on new/edit pages — hides non-essential chrome (privacy notice, templates, category/tags while focused) while keeping save controls and editor status visible. Vault Status Dock remains in site header.

## Daily note

`src/lib/notes/daily-note.ts` — title format `Daily note — YYYY-MM-DD`. **Daily note** is available from the header **New note ▾** menu on `/notes`; opens existing today’s note from decrypted vault index or routes to `/notes/new?daily=1` with Journal template. No plaintext server-side daily index.

## Security guarantees

1. Note body/title/tags/category encrypted before API.
2. No plaintext persistent drafts.
3. No HTML stored as canonical body.
4. DOMPurify on preview/paste; `javascript:` links blocked.
5. Account session does not unlock vault; lock clears decrypted editor state.

## Deferred (Track 2 plan)

- **Recovery phrase checkup** (word-position prompt) — Track 1 deferred item, not editor scope.

## Tests

- `src/test/features/editor-track-2.test.tsx`
- `src/test/unit/quick-insert-snippets.test.ts`
- `src/test/unit/daily-note.test.ts`
- Updated `note-templates.test.ts`, `markdown-editor.test.tsx`
