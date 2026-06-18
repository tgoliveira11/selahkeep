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
| Note detail lifecycle | `src/app/(vault)/notes/[id]/page.tsx` |

## Tests

| Layer | Files |
|-------|-------|
| Unit | `note-metadata.test.ts`, `smart-filters.test.ts`, `saved-views.test.ts`, `note-view-mode.test.ts`, `duplicate-note.test.ts`, updated `vault-index.test.ts`, `note-sort.test.ts` |
| Security | `note-org-metadata.test.ts` |
| Features | Updated `notes-ux.test.tsx`, `vault-status-ui.test.tsx`, `editor-track-2.test.tsx` |

## Validation

```bash
rm -rf .next
npm run lint
npm run test
npm run test:coverage  # ≥90% enforced scope
npm run build
```

## Remaining risks / follow-ups

- Trash auto-purge not implemented
- Checklist filter uses index `hasChecklist` flag (set on save); notes saved before Track 3 may lack the flag until next edit
- Full-text body search deferred to Track 4
