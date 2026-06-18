# SelahKeep — Notes Autosave and Template Switching

**Product:** SelahKeep  
**Status:** Current behavior (audited 2026-06-18)

This document describes encrypted draft/autosave rules on `/notes/new` and `/notes/[id]` (edit mode), and how template switching interacts with those rules.

## Summary

| Topic | Behavior |
|-------|----------|
| When autosave starts | Only after **user-originated** edits (`DraftUserActivation`: title, content, tags, or manual category) |
| Draft storage | IndexedDB `encrypted_note_drafts` store (`letters-vault` DB) |
| Encryption | AES-GCM via `encryptField` with vault session key; AAD field `note_draft` |
| Template prefill | Does **not** activate autosave or dirty state |
| Template switch | **Immediate** — no confirmation modal; **never** triggers autosave |

## When autosave starts

Autosave uses `useAutosaveTimer` (default **1500 ms** debounce) when:

1. Vault session is unlocked (`userId` present).
2. `isDraftActivatedByUser(draftActivation)` is `true` (any of title, content, tags, manualCategory).

Opening `/notes/new` alone does **not** start autosave.

## User-originated input (activates autosave)

Field-level activation via `activateDraft()`:

| Field | Triggers |
|-------|----------|
| `title` | Type or **paste** into title |
| `content` | Type or **paste** into editor (guarded against template `applyingTemplateRef`) |
| `tags` | Create, paste, or remove tags |
| `manualCategory` | Select/create category on **Blank note** only |

After activation, `persistDraft()` writes an encrypted draft containing `{ title, body, categoryId, tagIds, answered, updatedAt }`.

## Does not activate autosave

| Action | Notes |
|--------|-------|
| Opening `/notes/new` | No draft written |
| Selecting a template | Prefills title/body; does not call `activateDraft()` |
| Template-prefilled title/body | Programmatic state only |
| Template-assigned category lock | Read-only indicator; category resolved on **save**, not selection |
| `?template=` / `?daily=1` query entry | Initial state only |
| Switching templates | Replaces in-memory editor state; does not activate autosave |

Template switching never activates autosave. Prior user-originated `dirty` state is preserved, but the switch itself does not write a draft.

## Draft storage model

| Piece | Path |
|-------|------|
| API | `src/lib/crypto-client/note-drafts.ts` |
| New-note key | `NEW_NOTE_DRAFT_KEY = "new"` |
| Edit-note key | Note id |
| IndexedDB store | `encrypted_note_drafts` |
| Record shape | `{ userId, draftKey, payload: EncryptedPayload, updatedAt }` |

Plaintext exists only in React state and in memory during `encryptField` / `decryptField`. **No plaintext** title/body/category/tags is written to IndexedDB, localStorage, or sessionStorage.

## Encryption

`saveEncryptedNoteDraft`:

1. Requires `getSessionVaultKey()` (vault unlocked).
2. Serializes draft JSON and encrypts with vault key + AAD `{ userId, resourceId, field: "note_draft" }`.
3. Stores `EncryptedPayload` in IndexedDB.

Tests: `src/test/unit/note-drafts.test.ts`, `src/test/security/indexeddb-storage.test.ts`.

## Template switching (no confirmation modal, no autosave)

Template changes apply immediately with **no** `window.confirm` and **no** autosave on switch.

1. `applyingTemplateRef` guards editor `onChange` during programmatic template body updates.
2. New template body/title/category lock applied in memory.
3. Category rules unchanged:
   - Non-blank → hide manual category, show read-only template category indicator.
   - Blank → restore manual category controls.
   - Template category created/reused on **note save** only.

## Autosave before template switch

Template switching **does not** trigger autosave or an immediate draft flush. Debounced autosave continues only from prior user-originated activation.

## Vault lock while editing

`useNoteVaultBeforeAutoLock` registers `registerVaultBeforeAutoLock`: when the vault auto-locks due to inactivity, if dirty, `persistDraft()` runs before the session key is cleared.

`subscribeVaultSession` on lock clears in-memory editor state on `/notes/new`.

## Leaving `/notes/new`

| Mechanism | When |
|-----------|------|
| `beforeunload` | `useUnsavedChangesWarning(dirty)` — browser native prompt |
| Cancel button | `useConfirmLeave` — in-app confirm dialog |
| Successful save | Deletes encrypted new-note draft, navigates away |

Template prefill alone does **not** enable leave warnings.

## Editor status bar

`EditorStatus`: `idle` → `unsaved` (dirty) → `draft-saved` (after encrypted persist) → `saving` / `save-failed` on manual save.

## Known limitations

1. **Single new-note draft slot** — one encrypted draft per user for `draftKey: "new"`; template switch replaces in-editor content without autosave.
2. **Draft restore resets template** — restoring an encrypted draft sets `templateId` to `blank` and unlocks category (existing behavior).
3. **No template id in draft payload** — draft does not record which template was selected.
4. **Debounce gap** — without user edits, no draft; template switches never start autosave.

## Note state indicators (list/card)

Fixed slot order: **pinned → favorite → resolved/unresolved**. Archived/trash render after the core trio without shifting positions. List mode: Title | Category | Updated | States. Default view mode: **Cards** (`selahkeep:notes:view-mode` in localStorage).

## Security guarantees

1. Autosave/drafts never persist plaintext at rest.
2. Template switching does not send data to the server.
3. No plaintext note metadata in logs/errors from draft flow.
4. Account session alone does not unlock vault or drafts.
5. No Trusted Devices; no active `letters` domain in product flows.

## Key files

| Area | Path |
|------|------|
| New note page | `src/app/(vault)/notes/new/page.tsx` |
| Edit note page | `src/app/(vault)/notes/[id]/page.tsx` |
| Draft activation | `src/lib/notes/draft-user-activation.ts` |
| Encrypted drafts | `src/lib/crypto-client/note-drafts.ts` |
| Autosave timer / leave warnings | `src/features/notes/use-unsaved-changes.tsx` |
| Pre-lock draft flush | `src/features/notes/use-note-vault-before-auto-lock.ts` |
| Templates | `src/lib/notes/note-templates.ts`, `template-category.ts` |

## Tests

- `src/test/features/notes-autosave-template-switch.test.tsx`
- `src/test/features/notes-new-field-order.test.tsx`
- `src/test/features/notes-refinements.test.tsx`
- `src/test/unit/note-drafts.test.ts`
- `src/test/security/vault-auto-lock-draft.test.ts`
