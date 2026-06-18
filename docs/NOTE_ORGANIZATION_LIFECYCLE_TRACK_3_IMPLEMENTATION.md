# Note Organization, Views, and Note Lifecycle — Track 3 Implementation

**Status:** Complete  
**Date:** 2026-06-18  
**Product:** SelahKeep

## Summary

Priority Track 3 adds client-side note organization (pin, favorite, archive, trash), smart local filters, encrypted saved views, card/list view toggle, and duplicate note — all without plaintext organization metadata on the server.

## Encrypted metadata model

```ts
type NoteMetadataPlaintext = {
  title: string;
  categoryId: string | null;
  tagIds: string[];
  answered: boolean; // user-facing: resolved
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  trashed: boolean;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

- **Backward compatibility:** `normalizeNoteMetadata()` defaults missing lifecycle fields after decrypt.
- **Legacy mapping:** internal `answered` → user-facing **resolved**; v1 index `archived` → `trashed`; v2 `deletedAt` → `trashed` + `trashedAt`.
- **Track 5 (reflective):** `resolvedReflection` and `lifecycleEvents` in encrypted note metadata; index mirrors `hasResolvedReflection` and `resolvedAt` for list views. See `docs/REFLECTIVE_SPIRITUAL_WORKFLOWS_TRACK_5_IMPLEMENTATION.md`.

## Vault index v3

```ts
type VaultIndexPlaintext = {
  version: 3;
  categories: VaultCategory[];
  tags: VaultTag[];
  entries: VaultIndexNoteEntry[];
  savedViews?: SavedView[];
};
```

Index entries mirror note lifecycle fields plus optional `hasChecklist` and `isDailyNote` for filter performance.

## Feature implementation

| Feature | Storage | UI |
|---------|---------|-----|
| Pinned | Encrypted metadata + index | Pin/Unpin on detail; Pinned badge; sort boost |
| Favorites | Encrypted metadata + index | Favorite toggle; badge |
| Archive | Encrypted metadata + index | Archive/Unarchive; Archived filter |
| Trash | Encrypted metadata + index | Move to trash; restore; permanent delete with confirmation |
| Smart filters | Client-only after unlock | Dropdown on `/notes` |
| Saved views | Encrypted in vault index | Save/apply/delete on `/notes` |
| View mode | `localStorage` key `selahkeep:notes:view-mode` | Cards / List toggle |
| Duplicate note | New id + new Note Key | Duplicate action on detail |

### Trash behavior

- **Move to trash:** updates encrypted metadata/index only; ciphertext remains on server.
- **Restore:** clears `trashed` / `trashedAt`.
- **Permanent delete:** `DELETE /api/notes/:id` (server soft delete) + remove from vault index.
- **Auto-purge:** not implemented — documented in UI.

### Duplicate note

- Title: `Copy of <original title>`
- Body/category/tags copied; lifecycle reset (unresolved, unpinned, not favorite/archived/trashed)
- New note id and independent Note Key encryption (no blind ciphertext clone)

### Default list behavior

- **Active notes:** not archived AND not trashed
- **Sort:** pinned notes appear above unpinned within each sort group

## Smart local filters

All active, Pinned, Favorites, Resolved, Unresolved, Archived, Trash, No category, No tags, Checklist notes, Recently updated (7 days), Daily notes, Drafts.

Drafts filter uses encrypted draft keys from IndexedDB (`listEncryptedNoteDraftKeys`).

## Security boundaries (unchanged)

- No plaintext lifecycle fields on API or DB
- No `@tgoliveira/secure-auth` changes
- Vault cryptography and note encryption semantics unchanged
- Saved view names/criteria encrypted in vault index only

## Key files

| Area | Path |
|------|------|
| Metadata normalization | `src/lib/notes/note-metadata.ts` |
| Smart filters | `src/lib/notes/smart-filters.ts` |
| Saved views | `src/lib/notes/saved-views.ts` |
| View mode preference | `src/lib/notes/note-view-mode.ts` |
| Crypto metadata | `src/lib/crypto-client/notes.ts` |
| Vault index v3 | `src/lib/crypto-client/vault-index-types.ts`, `vault-index.ts` |
| Note hooks | `src/features/notes/use-notes.ts` |
| Notes list UI | `src/app/(vault)/notes/page.tsx` |
| Note detail lifecycle | `src/app/(vault)/notes/[id]/page.tsx`, `src/components/notes/note-reading-view.tsx`, `note-more-actions-menu.tsx` |

### Note detail reading view (UI)

`/notes/[id]` view mode uses `NoteReadingView`:

- **Edit** primary; **More actions** menu for pin, favorite, archive, duplicate, move to trash
- Fixed `NoteStateIndicators` (`interactive`) — pin → favorite → resolved
- Editorial `note-reading-surface` for Markdown body
- Archived/trash banners with adapted actions
- Locked: `VaultLockedState` (`read-note`) — no decrypted metadata

See [`UI_UX_DIRECTION.md`](./UI_UX_DIRECTION.md) — Note Reading View Pattern.

## Tests

| Layer | Files |
|-------|-------|
| Unit | `note-metadata.test.ts`, `smart-filters.test.ts`, `saved-views.test.ts`, `note-view-mode.test.ts`, `duplicate-note.test.ts`, updated `vault-index.test.ts`, `note-sort.test.ts` |
| Security | `note-org-metadata.test.ts` |
| Features | Updated `notes-ux.test.tsx`, `note-detail-reading-view.test.tsx`, `vault-status-ui.test.tsx`, `editor-track-2.test.tsx`, `notes-toolbar-refinement.test.tsx` |

## Validation

```bash
rm -rf .next
npm run lint
npm run test
npm run test:coverage  # ≥90% enforced scope
npm run build
```

## List controls region (UI refinement)

`/notes` uses `NotesListControls` — a compact toolbar (search, **Views ▾**, **Filters ▾**, **Sort ▾**, Cards/List), smart filter chips, and integrated note count. Saved views are secondary (`SavedViewsMenu`), not a large always-visible card.

Visibility (`shouldShowNotesListControls`): organizers (categories/tags), ≥1 note, active smart filter, active search/filter, or saved views. When hidden, sort/view/count/search are all hidden together. Zero notes with no organizers shows a polished empty state instead.

### Toolbar dropdown layering

`ToolbarMenu` panels portal to `document.body` with `toolbar-menu-panel` and `--z-toolbar-popover` (40). The controls shell uses `overflow: visible` so menus are not clipped. Escape closes menus and returns focus to the trigger.

### Shared toolbar control height

`--toolbar-control-height` (2.5rem) applies to `ToolbarButton` and `ViewModeToggle` so Views, Filters, Sort, and Cards/List align on one baseline.

### List vs card metadata

- **List mode:** category column only (no tags); separate States column for pin/favorite/archive/trash indicators; resolved/unresolved in status column.
- **Card mode:** category + tag chips; `NoteStateIndicators` includes resolved icon when applicable.

### Note state indicators

`NoteStateIndicators` (`src/components/notes/note-state-indicators.tsx`) provides accessible icon-only labels for resolved, pinned, favorite, archived, and trash. Pinned/favorite are suppressed when archived or trashed.

### `/notes/new` field priority and template categories

Field order: **Template → Category (blank note only) → Title → Editor → Tags**.

- Non-blank templates show a read-only template-assigned category; manual category controls are hidden.
- Template categories are created/reused on **note save** via `resolveTemplateCategoryId`, not on template selection.
- Blank-note manual dropdown lists user-created categories only (`filterUserCreatedCategories`).
- Reserved template names are blocked for manual category creation (`reserved-category-names.ts`).

## Remaining risks / follow-ups

- Trash auto-purge not implemented
- Checklist filter uses index `hasChecklist` flag (set on save); notes saved before Track 3 may lack the flag until next edit
- Full-text body search deferred to Track 4
